
"use server";

import { prisma } from '@/lib/prisma';
import { requireHospitalPermission, getVerifiedUser } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import type { EmailSettings } from '@prisma/client';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { createAuditLog } from '@/lib/audit';
import { ImapFlow } from 'imapflow';

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

// Schema for the simplified Gmail forms
const SimplifiedEmailSettingsSchema = z.object({
    id: z.number().optional(),
    hospitalId: z.number().optional().nullable(),
    name: z.string().min(1, 'Configuration name is required.'),
    smtpUser: z.string().email('Please enter a valid Gmail address.'),
    smtpPass: z.string().optional(),
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

  // Mask sensitive data before returning to client
  if (customSettings) {
    customSettings.smtpPass = '';
    customSettings.imapPass = null;
  }
  globalSettings.forEach(s => {
    s.smtpPass = '';
    s.imapPass = null;
  });

  return { customSettings, globalSettings };
}

export async function updateEmailSettings(hospitalId: number, data: Partial<EmailSettingsType>) {
  const allowed = await requireHospitalPermission('Settings:Update', hospitalId);
  if (!allowed) throw new Error('Unauthorized');
    // This action is now simplified for Gmail only for the hospital-facing UI
    const parsed = SimplifiedEmailSettingsSchema.parse(data);
    
    const validatedData: any = {
        name: parsed.name,
        smtpUser: parsed.smtpUser,
        // Set Gmail defaults
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpEncryption: 'tls',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapUser: parsed.smtpUser, // Use same user for IMAP
        imapEncryption: 'ssl',
    };

    // Only update password if provided
    if (parsed.smtpPass && parsed.smtpPass.length > 0) {
        validatedData.smtpPass = parsed.smtpPass;
        validatedData.imapPass = parsed.smtpPass;
    }

  const settingsData = {
    ...validatedData,
    configured: true,
    isGlobal: false,
    hospitalId,
  };
  
  const existingSettings = await prisma.emailSettings.findFirst({ where: { hospitalId } });

  let result: EmailSettings | null = null;
  if (existingSettings) {
    result = await prisma.emailSettings.update({
      where: { id: existingSettings.id },
      data: settingsData,
    });
  } else {
    result = await prisma.emailSettings.create({
      data: settingsData,
    });
  }

  try {
    const actor = await getVerifiedUser();
    await createAuditLog({
      actorId: actor?.id ?? 'system',
      actorType: actor?.role === 'superadmin' ? 'SuperAdmin' : 'User',
      action: existingSettings ? 'UPDATE_EMAIL_SETTINGS' : 'CREATE_EMAIL_SETTINGS',
      targetId: result.id,
      targetType: 'EmailSettings',
      changes: {
        name: result.name,
        isGlobal: result.isGlobal,
        hospitalId: result.hospitalId,
      },
    });
  } catch (err) {
    console.error('[audit] failed to log email settings change', err);
  }

  return result;
}

export async function testEmailConnection(settings: EmailSettingsType) {
  const results = {
    smtp: { success: false, error: 'Unknown error' },
    imap: { success: false, error: 'Unknown error' },
  };

    // If it's a gmail setup from a simplified form, ensure imap fields are set correctly for testing
    const settingsToTest = { ...settings } as EmailSettingsType;
    if (settings.smtpHost === 'smtp.gmail.com' || !settings.imapHost) {
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
      const isSsl = settingsToTest.smtpPort === 465 || settingsToTest.smtpEncryption === 'ssl';
      const isStartTls = !isSsl && (settingsToTest.smtpEncryption === 'tls' || settingsToTest.smtpPort === 587);
      const tlsRejectUnauthorized = process.env.NODE_ENV === 'production' && process.env.EMAIL_ALLOW_INSECURE !== 'true';

      const transporter = nodemailer.createTransport({
        host: settingsToTest.smtpHost,
        port: settingsToTest.smtpPort,
        secure: isSsl, // true for port 465 (SSL)
        requireTLS: !!isStartTls, // enforce STARTTLS when using TLS/port 587
        auth: {
          user: settingsToTest.smtpUser,
          pass: settingsToTest.smtpPass,
        },
        tls: {
          rejectUnauthorized: !!tlsRejectUnauthorized,
        },
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
    let client: ImapFlow | null = null;
    try {
      const imapSecure = settingsToTest.imapEncryption === 'ssl' || Number(settingsToTest.imapPort) === 993;
      const imapTlsRejectUnauthorized = process.env.NODE_ENV === 'production' && process.env.EMAIL_ALLOW_INSECURE !== 'true';

      client = new ImapFlow({
        host: settingsToTest.imapHost,
        port: Number(settingsToTest.imapPort),
        secure: imapSecure,
        auth: {
          user: settingsToTest.imapUser,
          pass: settingsToTest.imapPass,
        },
        tls: { rejectUnauthorized: !!imapTlsRejectUnauthorized }
      });

      // Simple test: connect and immediately logout to verify credentials and connectivity
      await client.connect();
      await client.logout();
      results.imap = { success: true, error: '' };
    } catch (error: any) {
      results.imap = { success: false, error: error.message };
    } finally {
      if (client) {
        try {
          // ensure client is closed
          await client.logout().catch(() => null);
        } catch (e) {
          console.error('Failed to close IMAP client:', e);
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
        select: { useGlobalEmailId: true, customEmail: { select: { id: true, name: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpEncryption: true, configured: true, isGlobal: true } } }
      });

      if (hospital) {
        if (hospital.useGlobalEmailId) {
          configToUse = await prisma.emailSettings.findUnique({ where: { id: hospital.useGlobalEmailId } });
        } else if (hospital.customEmail) {
          configToUse = hospital.customEmail as any;
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

    const isSsl = configToUse.smtpPort === 465 || configToUse.smtpEncryption === 'ssl';
    const isStartTls = !isSsl && (configToUse.smtpEncryption === 'tls' || configToUse.smtpPort === 587);
    const tlsRejectUnauthorized = process.env.NODE_ENV === 'production' && process.env.EMAIL_ALLOW_INSECURE !== 'true';

    return {
      transporter: nodemailer.createTransport({
        host: configToUse.smtpHost,
        port: configToUse.smtpPort,
        secure: isSsl,
        requireTLS: !!isStartTls,
        auth: {
          user: configToUse.smtpUser,
          pass: configToUse.smtpPass,
        },
        tls: {
          rejectUnauthorized: !!tlsRejectUnauthorized
        }
      }),
      fromUser: configToUse.smtpUser,
      fromName: configToUse.name,
    };
}


export async function sendWelcomeEmail(
    entityType: 'hospital' | 'doctor' | 'staff',
    details: { name: string; email: string; role?: string },
    hospitalId?: number
) {
    const subject = `Welcome to Nib Appointment - Your Account is Ready`;
    const loginUrl = entityType === 'doctor'
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/doctor-portal/login`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/hospital-admin/login`;

    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Welcome to NibAppointment, ${details.name}!</h2>
            <p>Your ${entityType === 'hospital' ? '' : `${details.role || ''} `}account has been created.</p>
            <p>You have been assigned a temporary password by your administrator. You will be required to change it upon your first login.</p>
             <p style="margin: 20px 0;">
                <a href="${loginUrl}" style="background-color: #F7D488; color: #2E2E2E; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Login to Your Account
                </a>
            </p>
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

export async function sendSetPasswordEmail(email: string, token: string, hospitalId?: number) {
    const subject = `Set Your Password for NibAppointment`;
    const setPasswordUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Activate Your NibAppointment Account</h2>
            <p>An account has been created for you. To get started, you need to set your password by clicking the link below.</p>
            <p>This link is valid for 1 hour.</p>
            <p style="margin: 20px 0;">
                <a href="${setPasswordUrl}" style="background-color: #F7D488; color: #2E2E2E; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Set Your Password
                </a>
            </p>
            <p>If you did not expect this, you can safely ignore this email.</p>
            <p>Thank you!</p>
        </div>
    `;

     try {
        const { transporter, fromUser, fromName } = await getEmailTransporter(hospitalId);

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromUser}>`,
            to: email,
            subject: subject,
            html: html,
        });

        console.log("Set password email sent to %s: %s", email, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error(`Failed to send set password email to ${email}:`, error);
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
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { name: true } });
    
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
    const isSimplified = !data.smtpHost && data.smtpUser && data.smtpPass;

    let validatedData;
    if (isSimplified) {
        const parsed = SimplifiedEmailSettingsSchema.parse(data);
        validatedData = {
            name: parsed.name,
            smtpUser: parsed.smtpUser,
            smtpPass: parsed.smtpPass,
            smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpEncryption: 'tls',
            imapHost: 'imap.gmail.com', imapPort: 993, imapUser: parsed.smtpUser, imapPass: parsed.smtpPass, imapEncryption: 'ssl',
        };
    } else {
        validatedData = EmailSettingsSchema.parse(data);
    }
    
    const settingsData = {
        ...validatedData,
        configured: true,
        isGlobal: true,
        hospitalId: null,
    };
  
    let result: EmailSettings | null = null;
    if(data.id) {
      result = await prisma.emailSettings.update({
        where: { id: data.id },
        data: settingsData,
      });
    } else {
      const existing = await prisma.emailSettings.findFirst({ where: { name: data.name, isGlobal: true }});
      if (existing) {
        throw new Error("A global email configuration with this name already exists.");
      }
      result = await prisma.emailSettings.create({ data: settingsData });
    }

    try {
      const actor = await getVerifiedUser();
      await createAuditLog({
      actorId: actor?.id ?? 'system',
      actorType: actor?.role === 'superadmin' ? 'SuperAdmin' : 'User',
      action: data.id ? 'UPDATE_GLOBAL_EMAIL_SETTINGS' : 'CREATE_GLOBAL_EMAIL_SETTINGS',
      targetId: result.id,
      targetType: 'EmailSettings',
      changes: { name: result.name },
      });
    } catch (err) {
      console.error('[audit] failed to log global email settings change', err);
    }

    return result;
}

export async function deleteGlobalEmailSetting(id: number) {
   const deleted = await prisma.emailSettings.delete({ where: { id }});
   try {
     const actor = await getVerifiedUser();
     await createAuditLog({
       actorId: actor?.id ?? 'system',
       actorType: actor?.role === 'superadmin' ? 'SuperAdmin' : 'User',
       action: 'DELETE_GLOBAL_EMAIL_SETTING',
       targetId: id,
       targetType: 'EmailSettings',
     });
   } catch (err) {
     console.error('[audit] failed to log delete global email setting', err);
   }
   return deleted;
}

export async function setHospitalEmailPreference(hospitalId: number, type: 'custom' | 'global', globalId: number | null) {
  const allowed = await requireHospitalPermission('Settings:Update', hospitalId);
  if (!allowed) throw new Error('Unauthorized');
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

  try {
    const actor = await getVerifiedUser();
    await createAuditLog({
      actorId: actor?.id ?? 'system',
      actorType: actor?.role === 'superadmin' ? 'SuperAdmin' : 'User',
      action: 'SET_HOSPITAL_EMAIL_PREFERENCE',
      targetId: hospitalId,
      targetType: 'Hospital',
      changes: { type, globalId }
    });
  } catch (err) {
    console.error('[audit] failed to log hospital email preference change', err);
  }
}

export async function sendPasswordResetEmail(email: string, token: string, hospitalId?: number) {
    const subject = `Reset Your NibAppointment Password`;
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Password Reset Request</h2>
            <p>You are receiving this email because a password reset was requested for your account.</p>
            <p>To reset your password, please click the link below. This link is valid for 15 minutes.</p>
            <p style="margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: #F7D488; color: #2E2E2E; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Reset Your Password
                </a>
            </p>
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            <p>Thank you!</p>
        </div>
    `;

    try {
      // For password resets, prefer a hospital-specific configuration when provided,
      // otherwise fall back to the global configuration.
      const { transporter, fromUser, fromName } = await getEmailTransporter(hospitalId);

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromUser}>`,
            to: email,
            subject: subject,
            html: html,
        });

        console.log("Password reset email sent to %s: %s", email, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error(`Failed to send password reset email to ${email}:`, error);
        return { success: false, error: error.message };
    }
}
