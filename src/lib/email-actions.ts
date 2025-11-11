
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

// Simplified schema for the new UI
const SimplifiedEmailSettingsSchema = z.object({
    id: z.number().optional(),
    hospitalId: z.number().optional().nullable(),
    name: z.string().min(1, 'Configuration name is required.'),
    smtpUser: z.string().email('Please enter a valid Gmail address.'),
    smtpPass: z.string().min(1, 'App Password is required.'),
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

export async function updateEmailSettings(hospitalId: number, data: Partial<EmailSettingsType>) {
  // Check if this is a simplified payload from the new UI
  const isSimplified = !data.smtpHost && data.smtpUser && data.smtpPass;

  let validatedData;

  if (isSimplified) {
      const parsed = SimplifiedEmailSettingsSchema.parse(data);
      validatedData = {
          name: parsed.name,
          smtpUser: parsed.smtpUser,
          smtpPass: parsed.smtpPass,
          // Set Gmail defaults
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpEncryption: 'tls',
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapUser: parsed.smtpUser, // Use same user for IMAP
          imapPass: parsed.smtpPass, // Use same pass for IMAP
          imapEncryption: 'ssl',
      };
  } else {
      validatedData = EmailSettingsSchema.parse(data);
  }

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

  const settingsToTest = { ...settings };
  // If it's a gmail setup, ensure imap fields are set correctly
  if (settings.smtpHost === 'smtp.gmail.com') {
      settingsToTest.imapHost = 'imap.gmail.com';
      settingsToTest.imapPort = 993;
      settingsToTest.imapEncryption = 'ssl';
      settingsToTest.imapUser = settings.smtpUser;
      settingsToTest.imapPass = settings.smtpPass;
  }

  if (!settingsToTest.smtpHost || !settingsToTest.smtpPort || !settingsToTest.smtpUser || !settingsToTest.smtpPass) {
    results.smtp.error = 'SMTP settings are incomplete.';
  } else {
    try {
      const transporter = nodemailer.createTransport({
        host: settingsToTest.smtpHost,
        port: settingsToTest.smtpPort,
        secure: settingsToTest.smtpEncryption === 'ssl',
        auth: {
          user: settingsToTest.smtpUser,
          pass: settingsToTest.smtpPass,
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

  if (!settingsToTest.imapHost || !settingsToTest.imapPort || !settingsToTest.imapUser || !settingsToTest.imapPass) {
    results.imap.error = 'IMAP settings are incomplete.';
  } else {
    let imapConnection;
    try {
      const config = {
        imap: {
          user: settingsToTest.imapUser,
          password: settingsToTest.imapPass,
          host: settingsToTest.imapHost,
          port: settingsToTest.imapPort,
          tls: settingsToTest.imapEncryption === 'tls' || settingsToTest.imapEncryption === 'ssl',
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

export async function getEmailTransporter(hospitalId?: number) {
    let configToUse: EmailSettings | null = null;
    
    // If hospitalId is provided, try to find its specific configuration
    if (hospitalId) {
        const hospital = await prisma.hospital.findUnique({
            where: { id: hospitalId },
            include: { customEmail: true }
        });

        if (hospital) {
            if (hospital.useGlobalEmailId) {
                configToUse = await prisma.emailSettings.findUnique({
                    where: { id: hospital.useGlobalEmailId }
                });
            } else if (hospital.customEmail) {
                configToUse = hospital.customEmail;
            }
        }
    }

    // If no hospital-specific config is found (or no hospitalId was given),
    // fall back to the first available global setting.
    if (!configToUse) {
        configToUse = await prisma.emailSettings.findFirst({
            where: { isGlobal: true }
        });
    }

    if (!configToUse || !configToUse.configured) {
        const context = hospitalId ? `for hospital ID ${hospitalId}` : 'globally';
        throw new Error(`Email is not configured ${context}.`);
    }

    return {
        transporter: nodemailer.createTransport({
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
        }),
        fromUser: configToUse.smtpUser,
        fromName: configToUse.name,
    };
}


export async function sendWelcomeEmail(
    entityType: 'hospital' | 'doctor' | 'staff',
    details: { name: string; email: string; rawPassword?: string; role?: string },
    hospitalId?: number
) {
    if (!details.rawPassword) {
        console.warn(`Attempted to send welcome email to ${details.email} without a password.`);
        return { success: false, error: "Password was not provided for the welcome email." };
    }

    const subject = `Welcome to Nib Appointment - Your Account is Ready`;
    const loginUrl = entityType === 'doctor'
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/doctor-portal/login`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/hospital-admin/login`;

    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Welcome to NibAppointment, ${details.name}!</h2>
            <p>Your ${entityType === 'hospital' ? '' : `${details.role} `}account has been successfully created.</p>
            <p>You can now log in to the portal using the following credentials:</p>
            <div style="background-color: #f2f2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                <p><strong>Email:</strong> ${details.email}</p>
                <p><strong>Password:</strong> <code style="background: #e1e1e1; padding: 3px 6px; border-radius: 4px;">${details.rawPassword}</code></p>
            </div>
            <p>We recommend changing your password after your first login.</p>
            <p>Thank you!</p>
        </div>
    `;

    try {
        const { transporter, fromUser, fromName } = await getEmailTransporter(hospitalId);

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromUser}>`,
            to: details.email,
            subject: subject,
            html: html,
        });

        console.log("Welcome email sent to %s: %s", details.email, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error(`Failed to send welcome email to ${details.email}:`, error);
        return { success: false, error: error.message };
    }
}


export async function sendHospitalEmail(
    hospitalId: number, 
    to: string, 
    subject: string, 
    text: string, 
    html?: string
) {
  try {
    const { transporter, fromUser } = await getEmailTransporter(hospitalId);
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    
    const info = await transporter.sendMail({
      from: `"${hospital?.name || 'NibAppointment System'}" <${fromUser}>`,
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
    await prisma.hospital.update({
      where: { id: hospitalId },
      data: { useGlobalEmailId: globalId }
    });
    // Disconnect any custom email setting if they are choosing a global one.
    const customEmail = await prisma.emailSettings.findFirst({ where: { hospitalId } });
    if (customEmail) {
      await prisma.hospital.update({ where: { id: hospitalId }, data: { customEmail: { disconnect: true } } });
    }
  } else {
    await prisma.hospital.update({
      where: { id: hospitalId },
      data: { useGlobalEmailId: null }
    });
  }
  revalidatePath('/hospital-admin/settings');
}
