// netlify/functions/contact.js
// Kirim email menggunakan Nodemailer + Gmail SMTP
// Set environment variables di Netlify Dashboard:
//   GMAIL_USER = email gmail pengirim
//   GMAIL_PASS = app password gmail (bukan password biasa)
//   NOTIFY_EMAIL = email tujuan notifikasi

const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { nama, email, instansi, pesan } = data;

  if (!nama || !email || !pesan) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Field nama, email, dan pesan wajib diisi." }),
    };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Format email tidak valid." }),
    };
  }

  const transporter = nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jayapura" });

  const mailOptions = {
    from: `"Sistem Kontak Satuan Intelijen" <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    replyTo: email,
    subject: `[PESAN MASUK] ${nama} — ${new Date().toLocaleDateString("id-ID")}`,
    html: `
      <div style="font-family:monospace;background:#050a05;color:#c8d8c8;padding:24px;max-width:600px;border:1px solid #2F4F2F;">
        <div style="border-bottom:1px solid #2F4F2F;padding-bottom:12px;margin-bottom:20px;">
          <h2 style="color:#4a9e4a;margin:0;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
            // SATUAN INTELIJEN KODAM XXIII — PESAN MASUK
          </h2>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="color:#4a9e4a;padding:6px 0;width:120px;">TIMESTAMP</td><td style="color:#c8d8c8;">${timestamp} WIT</td></tr>
          <tr><td style="color:#4a9e4a;padding:6px 0;">PENGIRIM</td><td style="color:#c8d8c8;">${nama}</td></tr>
          <tr><td style="color:#4a9e4a;padding:6px 0;">EMAIL</td><td style="color:#c8d8c8;">${email}</td></tr>
          <tr><td style="color:#4a9e4a;padding:6px 0;">INSTANSI</td><td style="color:#c8d8c8;">${instansi || "—"}</td></tr>
        </table>
        <div style="margin-top:20px;border-top:1px solid #2F4F2F;padding-top:16px;">
          <div style="color:#4a9e4a;font-size:12px;letter-spacing:1px;margin-bottom:8px;">// PESAN</div>
          <div style="background:#0d1a0d;padding:16px;border-left:2px solid #4a9e4a;color:#e8f0e8;line-height:1.7;white-space:pre-wrap;">${pesan}</div>
        </div>
        <div style="margin-top:20px;font-size:10px;color:#4a6a4a;letter-spacing:1px;">
          PESAN INI DIKIRIM MELALUI SISTEM FORMULIR RESMI — SATUAN INTELIJEN KODAM XXIII/PALAKA WIRA
        </div>
      </div>
    `,
  };

  // Auto-reply to sender
  const autoReply = {
    from: `"Satuan Intelijen Kodam XXIII" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Konfirmasi Penerimaan Pesan — Satuan Intelijen Kodam XXIII",
    html: `
      <div style="font-family:monospace;background:#050a05;color:#c8d8c8;padding:24px;max-width:600px;border:1px solid #2F4F2F;">
        <h2 style="color:#4a9e4a;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">
          // KONFIRMASI PENERIMAAN PESAN
        </h2>
        <p style="line-height:1.8;">Yth. <strong style="color:#e8f0e8;">${nama}</strong>,</p>
        <p style="line-height:1.8;margin-top:12px;">Pesan Anda telah diterima oleh sistem kami pada <strong style="color:#4a9e4a;">${timestamp} WIT</strong>. Tim kami akan meninjau dan merespons dalam waktu 1×24 jam hari kerja.</p>
        <div style="margin-top:20px;background:#0d1a0d;padding:16px;border-left:2px solid #4a9e4a;font-size:12px;color:#8a9e8a;">
          Jika ini bukan Anda yang mengirim pesan ini, abaikan email ini. Untuk keperluan mendesak, hubungi langsung melalui saluran resmi.
        </div>
        <div style="margin-top:20px;font-size:10px;color:#4a6a4a;letter-spacing:1px;">
          SATUAN INTELIJEN KODAM XXIII / PALAKA WIRA — TNI ANGKATAN DARAT
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(autoReply);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, message: "Pesan berhasil dikirim." }),
    };
  } catch (err) {
    console.error("Email error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Gagal mengirim email. Coba lagi nanti." }),
    };
  }
};
