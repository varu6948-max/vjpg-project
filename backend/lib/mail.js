// Sends the coupon to the VJ team via the Resend HTTP API (SMTP is blocked on Render's free tier).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendCouponEmail({ to, pdf, b }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY not configured' };

  const from = process.env.MAIL_FROM || 'VJ-PGs <onboarding@resend.dev>';
  const rows = [
    ['Token ID', b.tokenId], ['Issue Date', b.issuedDate], ['Student Name', b.fullName],
    ['Phone (WhatsApp)', b.phone], ['Account Email', b.accountEmail], ['College', b.collegeName],
    ['PG Name', b.pgName], ['Sharing Type', b.sharingType], ['Final Price (1st month)', `Rs. ${Number(b.price).toLocaleString('en-IN')}`],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#0073d2;margin:0 0 4px">New booking: ${esc(b.tokenId)}</h2>
    <p style="color:#59656e;margin:0 0 16px">A student generated a discount token on VJ-PGs. The PDF is attached.</p>
    <table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) =>
      `<tr><td style="border:1px solid #d8dfe4;padding:8px;background:#f5f8fa;font-weight:bold;width:40%">${esc(k)}</td><td style="border:1px solid #d8dfe4;padding:8px">${esc(v)}</td></tr>`).join('')}</table>
  </div>`;

  try {
    const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: b.accountEmail,
        subject: `NEW BOOKING: ${b.tokenId} - ${b.fullName}`,
        html,
        attachments: [{ filename: `VJ_Token_${b.tokenId}.pdf`, content: pdf.toString('base64') }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || `Resend HTTP ${res.status}` };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { sendCouponEmail };
