
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { EmailSettings } from '@prisma/client';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';

const EmailSettingsSchema = z.object({
  id: z.number().optional(),
  hospitalId: z.number().optional().nullable(),
  isGlobal: z.boolean().optional(),
  name: z.string().min(1, 'Configuration name is required.'),
  
  smtpHost: z.string().min(1, 'SMTP Host is required.'),
  smtpPort: z.coerce.number().min(1, 'SMTP Port is required.'),
  smtpUser: z.string().min(1, 'SMTP User is required.'),
  smtpPass: z.string().min(1, 'SMTP Password is required.'),
  smtpEncryption: z.enum(['tls', 'ssl', 'none']),

  imapHost: z.string().min(1, 'IMAP Host is required.'),
  imapPort: z.coerce.number().min(1, 'IMAP Port is required.'),
  imapUser: z.string().min(1, 'IMAP User is required.'),
  imapPass: z.string().min(1, 'IMAP Password is required.'),
  imapEncryption: z.enum(['tls', 'ssl']),
  
  configured: z.boolean().optional(),
});

export type EmailSettingsType = z.infer<typeof EmailSettingsSchema>;

export async function getEmailSettings(hospitalId: number) {
  const [customSettings, globalSettings] = await Promise.all([
    prisma.emailSettings.findFirst({
      where: { hospitalId },
    }),
    prisma.emailSettings.findMany({
      where: { isGlobal: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  return { customSettings, globalSettings };
}

export async function updateEmailSettings(hospitalId: number, data: EmailSettingsType) {
  const validatedData = EmailSettingsSchema.parse(data);
  const settingsData = {
    ...validatedData,
    configured: true,
    isGlobal: false,
    hospitalId,
  };
  
  const existingSettings = await prisma.emailSettings.findFirst({ where: { hospitalId } });

  if (existingSettings) {
    return await prisma.emailSettings.update({
      where: { id: existingSettings.id },
      data: settingsData,
    });
  } else {
    return await prisma.emailSettings.create({
      data: settingsData,
    });
  }
}

export async function testEmailConnection(settings: EmailSettingsType) {
  const results = {
    smtp: { success: false, error: 'Unknown error' },
    imap: { success: false, error: 'Unknown error' },
  };

  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass) {
    results.smtp.error = 'SMTP settings are incomplete.';
  } else {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpEncryption === 'ssl',
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      await transporter.verify();
      results.smtp = { success: true, error: '' };
    } catch (error: any) {
      results.smtp = { success: false, error: error.message };
    }
  }

  if (!settings.imapHost || !settings.imapPort || !settings.imapUser || !settings.imapPass) {
    results.imap.error = 'IMAP settings are incomplete.';
  } else {
    let imapConnection;
    try {
      const config = {
        imap: {
          user: settings.imapUser,
          password: settings.imapPass,
          host: settings.imapHost,
          port: settings.imapPort,
          tls: settings.imapEncryption === 'tls' || settings.imapEncryption === 'ssl',
          tlsOptions: { rejectUnauthorized: false }
        }
      };
      imapConnection = await imaps.connect(config);
      results.imap = { success: true, error: '' };
    } catch (error: any) {
      results.imap = { success: false, error: error.message };
    } finally {
      if (imapConnection) {
        try {
          await imapConnection.end();
        } catch (e) {
          console.error("Failed to end IMAP connection:", e);
        }
      }
    }
  }

  return results;
}

export async function getEmailTransporter(hospitalId: number) {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    include: { customEmail: true }
  });

  if (!hospital) {
    throw new Error('Hospital not found');
  }

  let configToUse: EmailSettings | null = null;

  if (hospital.customEmail) {
    configToUse = hospital.customEmail;
  } 
  else if (hospital.useGlobalEmailId) {
    configToUse = await prisma.emailSettings.findUnique({
      where: { id: hospital.useGlobalEmailId }
    });
  }

  if (!configToUse || !configToUse.configured) {
    throw new Error(`Email is not configured for this hospital.`);
  }

  return nodemailer.createTransport({
    host: configToUse.smtpHost,
    port: configToUse.smtpPort,
    secure: configToUse.smtpPort === 465 || configToUse.smtpEncryption === 'ssl',
    auth: {
      user: configToUse.smtpUser,
      pass: configToUse.smtpPass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

export async function sendHospitalEmail(
    hospitalId: number, 
    to: string, 
    subject: string, 
    text: string, 
    html?: string
) {
  try {
    const transporter = await getEmailTransporter(hospitalId);
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  const settings = await getEmailSettings(hospitalId);
  const fromUser = settings.customSettings?.smtpUser || (await prisma.emailSettings.findFirst({ where: { id: hospital?.useGlobalEmailId ?? -1 }}))?.smtpUser;
    
    if (!fromUser) {
        throw new Error("Could not determine sender email address.");
    }
    
    const info = await transporter.sendMail({
      from: `"${hospital?.name}" <${fromUser}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send email:", error);
    return { success: false, error: error.message };
  }
}

// ---- Super Admin Actions ----

export async function getGlobalEmailSettings() {
  return await prisma.emailSettings.findMany({
    where: { isGlobal: true },
    orderBy: { name: 'asc' },
  });
}

export async function saveGlobalEmailSettings(data: Omit<EmailSettingsType, 'hospitalId'>) {
  const validatedData = EmailSettingsSchema.parse(data);
  const settingsData = {
    ...validatedData,
    configured: true,
    isGlobal: true,
    hospitalId: null,
  };
  
  if(data.id) {
    return await prisma.emailSettings.update({
      where: { id: data.id },
      data: settingsData,
    });
  } else {
    // Check for unique name on creation
   const existing = await prisma.emailSettings.findFirst({ where: { name: data.name, isGlobal: true }});
    if (existing) {
        throw new Error("A global email configuration with this name already exists.");
    }
   return await prisma.emailSettings.create({ data: settingsData });
  }
}

export async function deleteGlobalEmailSetting(id: number) {
   return await prisma.emailSettings.delete({ where: { id }});
}

export async function setHospitalEmailPreference(hospitalId: number, type: 'custom' | 'global', globalId: number | null) {
  if (type === 'global' && globalId) {
    return await prisma.hospital.update({
      where: { id: hospitalId },
      data: { useGlobalEmailId: globalId, customEmail: { disconnect: true } }
    });
  } else {
    return await prisma.hospital.update({
      where: { id: hospitalId },
      data: { useGlobalEmailId: null }
    });
  }
}
