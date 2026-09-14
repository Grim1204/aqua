// Reçoit les prospects capturés côté site (chat de l'assistant, newsletter)
// et vous les envoie par e-mail via Brevo, pour que vous les receviez
// vraiment au lieu qu'ils restent seulement dans le navigateur du visiteur.
//
// Configuration requise sur Netlify (Site configuration → Environment variables) :
//   BREVO_API_KEY   -> votre clé API Brevo (Brevo → Paramètres → Clés API)
//   OWNER_EMAIL      -> l'adresse qui doit recevoir les prospects (ex. bdsg1987@gmail.com)
//   SENDER_EMAIL     -> l'adresse d'expédition, doit être vérifiée dans Brevo
//                       (Brevo → Expéditeurs) ; si absente, OWNER_EMAIL est réutilisée.
//
// Aucun template Brevo à créer pour cette fonction : l'e-mail est généré
// directement ici (HTML simple), contrairement à l'intégration PayPal qui,
// elle, utilise des templates Brevo prédéfinis.

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const email = (payload.email || '').trim();
  const question = (payload.question || '').trim();
  const source = (payload.source || 'chat').trim(); // 'chat' ou 'newsletter'
  const page = (payload.page || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Adresse e-mail invalide' }) };
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  const senderEmail = process.env.SENDER_EMAIL || ownerEmail;
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || !ownerEmail) {
    console.error('send-lead: BREVO_API_KEY ou OWNER_EMAIL manquant dans les variables d\'environnement Netlify.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration serveur incomplète' }) };
  }

  const sourceLabel = source === 'newsletter' ? 'Inscription newsletter' : 'Question posée via le chat AquaSource';
  const subject = source === 'newsletter'
    ? 'Nouvelle inscription newsletter — AquaSource'
    : 'Nouveau contact via le chat AquaSource';

  const html =
    '<div style="font-family:sans-serif;font-size:14px;color:#141413;">' +
    '<h2 style="margin:0 0 12px;">' + escapeHtml(sourceLabel) + '</h2>' +
    '<p><strong>E-mail du visiteur :</strong> ' + escapeHtml(email) + '</p>' +
    (question ? '<p><strong>Question posée :</strong><br>' + escapeHtml(question) + '</p>' : '') +
    (page ? '<p><strong>Page :</strong> ' + escapeHtml(page) + '</p>' : '') +
    '<p style="color:#6a827a;font-size:12px;">Reçu automatiquement depuis le site AquaSource.</p>' +
    '</div>';

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: 'Site AquaSource' },
        to: [{ email: ownerEmail }],
        replyTo: { email: email },
        subject: subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('send-lead: réponse Brevo non-OK', res.status, errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Échec de l\'envoi via Brevo' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-lead:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
