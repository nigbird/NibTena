'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { EmailConfiguration } from '@prisma/client';
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

/**
 * Fetches the email settings for a specific hospital.
 * Returns the hospital's custom configuration and a list of available global configurations.
 */
export async function getEmailSettings(hospitalId: number) {
  const [customSettings, globalSettings] = await Promise.all([
    prisma.emailConfiguration.findFirst({
      where: { hospitalId },
    }),
    prisma.emailConfiguration.findMany({
      where: { isGlobal: true },
    }),
  ]);
  return { customSettings, globalSettings };
}

/**
 * Updates or creates email settings for a hospital.
 */
export async function updateEmailSettings(hospitalId: number, data: EmailSettingsType) {
  const validatedData = EmailSettingsSchema.parse(data);
  const settingsData = {
    ...validatedData,
    configured: true,
    isGlobal: false,
    hospitalId,
  };
  
  const existingSettings = await prisma.emailConfiguration.findFirst({ where: { hospitalId } });

  if (existingSettings) {
    return await prisma.emailConfiguration.update({
      where: { id: existingSettings.id },
      data: settingsData,
    });
  } else {
    return await prisma.emailConfiguration.create({
      data: settingsData,
    });
  }
}

/**
 * Tests SMTP and IMAP connection for a given configuration.
 */
export async function testEmailConnection(settings: EmailSettingsType) {
  const results = {
    smtp: { success: false, error: 'Unknown error' },
    imap: { success: false, error: 'Unknown error' },
  };

  // Test SMTP
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

  // Test IMAP
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

/**
 * Gets a configured nodemailer transporter for a hospital.
 * It intelligently selects the correct configuration (custom or global).
 */
export async function getEmailTransporter(hospitalId: number) {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    include: { emailConfiguration: true }
  });

  if (!hospital) {
    throw new Error('Hospital not found');
  }

  let configToUse: EmailConfiguration | null = null;

  // 1. Check for a custom configuration
  if (hospital.emailConfiguration) {
    configToUse = hospital.emailConfiguration;
  } 
  // 2. If no custom config, check if a global one is selected
  else if (hospital.useGlobalEmailId) {
    configToUse = await prisma.emailConfiguration.findUnique({
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

/**
 * Sends an email using the correct transporter for the hospital.
 */
export async function sendHospitalEmail(
    hospitalId: number, 
    to: string, 
    subject: string, 
    text: string, 
    html?: string
) {
  try {
    const transporter = await getEmailTransporter(hospitalId);
    const info = await transporter.sendMail({
      from: `"${(await prisma.hospital.findUnique({where: {id: hospitalId}}))?.name}" <${(await getEmailSettings(hospitalId)).customSettings?.smtpUser}>`, // sender address
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
