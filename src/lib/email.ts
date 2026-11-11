import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  to: string;
  name: string;
  code: string;
}

export async function sendOtpEmail({ to, name, code }: SendOtpEmailParams): Promise<{ sent: boolean; messageId?: string; error?: string; devCode?: string }> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
  const from = process.env.SMTP_FROM || (user ? `"Lax Pixel" <${user}>` : '"Lax Pixel" <no-reply@laxpixel.com>');

  // If no SMTP configured, log to server console for dev verification
  if (!user || !pass) {
    console.log(`\n======================================================`);
    console.log(`[LAX PIXEL EMAIL SIMULATOR]`);
    console.log(`To: ${to} (${name})`);
    console.log(`Subject: Your 6-Digit Verification Code`);
    console.log(`CODE: >>> ${code} <<<`);
    console.log(`Notice: To send real emails, add SMTP_USER and SMTP_PASS (Gmail App Password) to .env`);
    console.log(`======================================================\n`);

    return { sent: false, devCode: code, error: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code - Lax Pixel</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0c0d0e; padding: 40px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 500px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; padding: 36px 28px; text-align: center;">
                  <tr>
                    <td>
                      <div style="font-size: 22px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; color: #ffffff; margin-bottom: 24px;">
                        LAX PIXEL
                      </div>
                      <div style="height: 1px; background: linear-gradient(90deg, transparent, #3f3f46, transparent); margin-bottom: 28px;"></div>
                      
                      <h1 style="font-size: 20px; font-weight: 500; color: #ffffff; margin: 0 0 12px 0;">
                        Verify Your Email Address
                      </h1>
                      <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 28px 0;">
                        Hello <strong style="color: #ffffff;">${name || 'Valued User'}</strong>,<br>
                        Thank you for registering at Lax Pixel. Please enter the following 6-digit verification code to activate your account:
                      </p>

                      <div style="background-color: #09090b; border: 1px solid #3f3f46; border-radius: 10px; padding: 18px 24px; margin: 0 auto 28px auto; display: inline-block;">
                        <span style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; color: #ffffff; font-family: 'Courier New', Courier, monospace;">
                          ${code}
                        </span>
                      </div>

                      <p style="font-size: 12px; color: #71717a; margin: 0 0 24px 0;">
                        This code is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.
                      </p>

                      <div style="height: 1px; background: #27272a; margin-bottom: 20px;"></div>
                      <p style="font-size: 11px; color: #52525b; margin: 0; letter-spacing: 0.05em;">
                        &copy; ${new Date().getFullYear()} Lax Pixel. AI-Powered Luxury E-Commerce.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      subject: `${code} is your Lax Pixel verification code`,
      text: `Hello ${name || 'User'},\n\nYour 6-digit Lax Pixel verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nLax Pixel Team`,
      html,
    });

    console.log(`[EMAIL-SUCCESS] OTP email successfully sent to ${to}, messageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL-ERROR] Failed to send email via SMTP:', error);
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}
