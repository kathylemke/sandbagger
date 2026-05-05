import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.mail.me.com',
  port: 587,
  secure: false,
  auth: {
    user: 'clawd139@icloud.com',
    pass: process.env.SMTP_PASSWORD || 'trbi-fjmk-ntcs-mjws',
  },
});

export async function sendMagicLinkEmail(email: string, magicLink: string): Promise<void> {
  const mailOptions = {
    from: '"Sandbagger" <clawd139@icloud.com>',
    to: email,
    subject: '🔑 Your Sandbagger login link',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { background: #1a472a; border-radius: 16px; padding: 32px; max-width: 480px; margin: 0 auto; }
    .logo { color: #c5a528; font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 8px; }
    .title { color: #ffffff; font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 28px; text-align: center; }
    .btn { display: inline-block; background: #1a472a; color: #c5a528; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin: 16px 0; }
    .note { color: #888; font-size: 12px; margin-top: 16px; }
    .footer { text-align: center; color: rgba(255,255,255,0.5); font-size: 11px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⛳ Sandbagger</div>
    <div class="title'>Your login link</div>
    <div class="card">
      <p style="color:#333; font-size:15px; margin:0 0 8px;">Tap the button below to sign in instantly — no password needed.</p>
      <a href="${magicLink}" class="btn">Sign in to Sandbagger →</a>
      <p class="note">This link expires in 15 minutes and can only be used once.</p>
      <p class="note">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">Sent by Sandbagger · tap⛳.com</div>
  </div>
</body>
</html>`,
    text: `Tap this link to sign in to Sandbagger: ${magicLink}\n\nThis link expires in 15 minutes and can only be used once.`,
  };

  await transporter.sendMail(mailOptions);
}