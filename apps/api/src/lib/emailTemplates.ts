
export const emailStyles = {
  primaryColor: '#E11D48',
  backgroundColor: '#FFF5F7',
  textColor: '#4B5563',
  headingColor: '#111827',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
}

const baseEmailLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laguin.id</title>
  <style>
    body {
      font-family: ${emailStyles.fontFamily};
      background-color: ${emailStyles.backgroundColor};
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      margin-top: 40px;
      margin-bottom: 40px;
    }
    .header {
      background-color: #ffffff;
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #FFE4E6;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: serif;
      font-size: 20px;
      font-weight: bold;
      color: ${emailStyles.primaryColor};
      text-decoration: none;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background-color: ${emailStyles.primaryColor};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: serif;
      font-weight: bold;
      margin-right: 8px;
    }
    .content {
      padding: 32px 24px;
      color: ${emailStyles.textColor};
      line-height: 1.6;
    }
    .footer {
      background-color: #FDF2F8;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #9CA3AF;
    }
    .button {
      display: inline-block;
      background-color: ${emailStyles.primaryColor};
      color: white;
      padding: 12px 24px;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: bold;
      margin: 16px 0;
      text-align: center;
    }
    .code-box {
      background-color: #FFF1F2;
      border: 1px solid #FECDD3;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 4px;
      color: ${emailStyles.primaryColor};
      margin: 24px 0;
    }
    h1 {
      color: ${emailStyles.headingColor};
      font-size: 24px;
      margin-bottom: 16px;
      margin-top: 0;
    }
    p {
      margin-bottom: 16px;
    }
    .link-text {
      color: ${emailStyles.primaryColor};
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div style="padding: 20px;">
    <div class="container">
      <div class="header">
        <div class="logo">
          <span style="display:inline-block;width:32px;height:32px;background-color:#E11D48;color:white;border-radius:50%;text-align:center;line-height:32px;margin-right:8px;">L</span>
          Laguin.id
        </div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Laguin.id. All rights reserved.<br>
        Membuat pria menangis sejak 2024 💕
      </div>
    </div>
  </div>
</body>
</html>
`

export function generateOtpEmailHtml(code: string) {
  const content = `
    <h1>Verifikasi Email Kamu</h1>
    <p>Hai,</p>
    <p>Terima kasih telah mendaftar di Laguin.id. Gunakan kode berikut untuk verifikasi email kamu:</p>
    
    <div class="code-box">${code}</div>
    
    <p style="font-size: 14px; color: #6B7280;">
      Kode ini berlaku selama 10 menit. Jika kamu tidak merasa melakukan permintaan ini, silakan abaikan email ini.
    </p>
  `
  return baseEmailLayout(content)
}

export function generateSongCompletedEmailHtml(params: { 
  customerName: string; 
  trackUrl: string;
  trackUrls?: string[];
}) {
  const { customerName, trackUrl, trackUrls } = params
  
  // Use trackUrls if available, otherwise fallback to trackUrl
  const links = (trackUrls && trackUrls.length > 0) ? trackUrls : [trackUrl]
  
  const linksHtml = links.map((url, index) => `
    <div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 12px;">
      <p style="font-weight: bold; margin-bottom: 12px; color: #111827;">Lagu Versi ${index + 1}</p>
      <a href="${url}" style="display: inline-block; background-color: #E11D48; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; margin-bottom: 12px;">Putar Lagu ${index + 1}</a>
      <p style="font-size: 12px; margin: 0; word-break: break-all; color: #6B7280;">
        Link: <a href="${url}" style="color: #E11D48; text-decoration: none;">${url}</a>
      </p>
    </div>
  `).join('')

  const content = `
    <h1 style="color: #E11D48; margin-bottom: 24px;">Lagu Pesananmu Siap! 🎵</h1>
    
    <p style="font-size: 18px; margin-bottom: 24px;">Lagu untuk <strong>${customerName}</strong> sudah siap!</p>
    
    <p>Kabar gembira! Lagu spesial yang kamu pesan sudah selesai dibuat. Kami telah menuangkan cerita dan perasaanmu ke dalam lirik dan nada yang indah.</p>
    
    <p>Silakan dengarkan hasilnya di bawah ini (kami sertakan semua versi yang tersedia):</p>
    
    <div style="text-align: center; margin: 32px 0;">
      ${linksHtml}
    </div>
    
    <p>Semoga lagu ini bisa menjadi kado terindah untuk momen spesialmu.</p>
    <p>Terima kasih telah mempercayakan kenanganmu pada Laguin.id!</p>
  `
  return baseEmailLayout(content)
}
