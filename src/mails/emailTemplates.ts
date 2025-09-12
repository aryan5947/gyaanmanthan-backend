function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function welcomeTemplate(opts: { name: string; verifyLink: string; year?: string | number; }) {
  const year = String(opts.year ?? new Date().getFullYear());
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Segoe UI,Arial,sans-serif;background:#f7f8fa;margin:0;padding:0">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.06)">
      <div style="background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:32px;color:#fff;text-align:center">
        <h1>Welcome to GyaanManthan 🎉</h1>
      </div>
      <div style="padding:28px;color:#1f2937">
        <p>Hi <strong>${escapeHtml(opts.name)}</strong>,</p>
        <p>We’re excited to have you on board. Please confirm your email to activate your account.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${opts.verifyLink}" style="background:#1a73e8;color:#fff;padding:14px 26px;border-radius:8px;text-decoration:none;font-weight:600">Verify your email</a>
        </div>
        <p style="font-size:12px;color:#6b7280">If you didn’t sign up, you can safely ignore this email.</p>
      </div>
      <div style="text-align:center;font-size:12px;color:#9aa3af;padding:20px">© ${year} GyaanManthan • All rights reserved</div>
    </div>
  </body>
  </html>`;
}

export function resetTemplate(opts: { name: string; resetLink: string; minutes: number; year?: string | number; }) {
  const year = String(opts.year ?? new Date().getFullYear());
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Segoe UI,Arial,sans-serif;background:#f7f8fa;margin:0;padding:0">
    <div style="max-width:640px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.06)">
      <div style="background:linear-gradient(135deg,#e53935,#b71c1c);padding:32px;color:#fff;text-align:center">
        <h1>Password reset request</h1>
      </div>
      <div style="padding:28px;color:#1f2937">
        <p>Hi <strong>${escapeHtml(opts.name)}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to set a new one.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${opts.resetLink}" style="background:#e53935;color:#fff;padding:14px 26px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
        </div>
        <p style="font-size:12px;color:#6b7280">This link expires in ${opts.minutes} minutes. If you didn’t request this, please ignore this email.</p>
      </div>
      <div style="text-align:center;font-size:12px;color:#9aa3af;padding:20px">© ${year} GyaanManthan</div>
    </div>
  </body>
  </html>`;
}
