// Sends the confirmation email (address + access) after a verified payment.
// Uses Resend (https://resend.com). If RESEND_API_KEY is not set, it no-ops so
// the webhook never fails just because email isn't configured yet.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || 'Paname Roof <onboarding@resend.dev>';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}

function accessLine(it) {
  if (it.accessMethod === 'Accompagné') {
    return 'Accès guidé — un hôte vous retrouve à l\'entrée et vous conduit sur le toit le jour J.';
  }
  return (it.accessMethod === 'Clé' ? 'Clé d\'accès : ' : 'Code d\'entrée : ') + esc(it.accessValue);
}

function itemHtml(it) {
  return ''
    + '<table role="presentation" width="100%" style="border-collapse:collapse;margin:12px 0;background:#faf7f0;border:1px solid #e7dcc2;border-radius:10px">'
    + '<tr><td style="padding:16px 18px">'
    + '<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a7c55">' + esc(it.name) + ' · ' + esc(it.area) + '</div>'
    + '<div style="font-family:Georgia,serif;font-size:18px;color:#1c1c1c;margin:4px 0 10px">' + esc(it.address) + '</div>'
    + '<div style="font-size:15px;color:#0b5">' + accessLine(it) + '</div>'
    + (it.accessNote ? '<div style="font-size:14px;color:#a15;margin-top:6px">À prévoir : ' + esc(it.accessNote) + '</div>' : '')
    + '</td></tr></table>';
}

function buildHtml(payload) {
  var items = payload.type === 'pass' ? payload.items : [payload.item];
  var intro = payload.type === 'pass'
    ? 'Votre Pass intégral est confirmé. Voici l\'adresse et l\'accès de chaque toit.'
    : 'Votre réservation est confirmée. Voici votre adresse et votre accès.';
  return ''
    + '<div style="background:#0B0E1A;padding:24px;text-align:center">'
    + '<span style="font-family:Georgia,serif;font-size:22px;color:#E7C878">✦ Paname Roof</span></div>'
    + '<div style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c">'
    + '<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">À dans les étoiles ✨</h1>'
    + '<p style="color:#555;font-size:15px;margin:0 0 8px">' + intro + '</p>'
    + items.map(itemHtml).join('')
    + '<p style="color:#555;font-size:14px;margin-top:16px">Un hôte vous accueille dès 22h15 le 13 juillet. Présentez cet e-mail à l\'entrée.</p>'
    + '<p style="color:#999;font-size:12px;margin-top:24px">Paname Roof — merci et bonne soirée !</p>'
    + '</div>';
}

async function sendConfirmation(to, payload) {
  if (!to) { console.warn('[email] pas d\'adresse e-mail sur la session'); return; }
  if (!RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY absent — e-mail non envoyé à ' + to + ' (configurez Resend pour activer)');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject: 'Paname Roof — votre adresse et votre accès',
        html: buildHtml(payload)
      })
    });
    if (!res.ok) console.error('[email] échec Resend', res.status, await res.text());
    else console.log('[email] confirmation envoyée à ' + to);
  } catch (err) {
    console.error('[email] erreur', err.message);
  }
}

module.exports = { sendConfirmation, buildHtml };
