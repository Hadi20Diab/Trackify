import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.LOCAL_API_PORT ?? 3001);

app.use(express.json());

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.post('/api/contact', async (req, res) => {
  const body = req.body ?? {};
  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const subject = (body.subject ?? '').trim();
  const message = (body.message ?? '').trim();

  if (!name || !email || !subject || !message) {
    res.status(400).json({ message: 'All fields are required.' });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ message: 'Invalid email address.' });
    return;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM ?? smtpUser;
  const contactRecipient = process.env.CONTACT_TO ?? smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom || !contactRecipient) {
    res.status(503).json({ message: 'SMTP is not configured on the server.' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: contactRecipient,
      replyTo: `${name} <${email}>`,
      subject: `[Trackify Contact] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <h2>Trackify Contact Message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr />
        <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
      `,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('SMTP send error:', error);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

app.listen(port, () => {
  console.log(`Trackify local API running on http://localhost:${port}`);
});
