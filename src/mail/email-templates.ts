/**
 * Email templates in multiple languages
 */

interface VerificationEmailContent {
  subject: string;
  heading: string;
  body: string;
  buttonText: string;
  linkText: string;
  expiryText: string;
}

interface PasswordResetEmailContent {
  subject: string;
  heading: string;
  body: string;
  buttonText: string;
  linkText: string;
  expiryText: string;
  ignoreText: string;
}

const verificationTemplates: Record<string, VerificationEmailContent> = {
  en: {
    subject: 'Verify your email address',
    heading: 'Welcome to Croffers Nest!',
    body: 'Thank you for signing up. Please verify your email address to activate your account.',
    buttonText: 'Verify Email',
    linkText: 'Or copy and paste this link into your browser:',
    expiryText: "This link will expire in 24 hours. If you didn't sign up for Croffers Nest, please ignore this email.",
  },
  hr: {
    subject: 'Potvrdite svoju email adresu',
    heading: 'Dobrodošli u Croffers Nest!',
    body: 'Hvala što ste se registrirali. Molimo potvrdite svoju email adresu kako biste aktivirali svoj račun.',
    buttonText: 'Potvrdi Email',
    linkText: 'Ili kopirajte i zalijepite ovaj link u svoj preglednik:',
    expiryText: 'Ovaj link će isteći za 24 sata. Ako se niste registrirali na Croffers Nest, molimo ignorirajte ovaj email.',
  },
  de: {
    subject: 'Bestätigen Sie Ihre E-Mail-Adresse',
    heading: 'Willkommen bei Croffers Nest!',
    body: 'Vielen Dank für Ihre Anmeldung. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.',
    buttonText: 'E-Mail bestätigen',
    linkText: 'Oder kopieren Sie diesen Link in Ihren Browser:',
    expiryText: 'Dieser Link läuft in 24 Stunden ab. Wenn Sie sich nicht bei Croffers Nest angemeldet haben, ignorieren Sie bitte diese E-Mail.',
  },
  it: {
    subject: 'Verifica il tuo indirizzo email',
    heading: 'Benvenuto su Croffers Nest!',
    body: 'Grazie per esserti registrato. Verifica il tuo indirizzo email per attivare il tuo account.',
    buttonText: 'Verifica Email',
    linkText: 'Oppure copia e incolla questo link nel tuo browser:',
    expiryText: 'Questo link scadrà tra 24 ore. Se non ti sei registrato su Croffers Nest, ignora questa email.',
  },
};

const passwordResetTemplates: Record<string, PasswordResetEmailContent> = {
  en: {
    subject: 'Reset your password',
    heading: 'Password Reset Request',
    body: 'We received a request to reset your password.',
    buttonText: 'Reset Password',
    linkText: 'Or copy and paste this link into your browser:',
    expiryText: 'This link will expire in 1 hour.',
    ignoreText: "If you didn't request a password reset, please ignore this email. Your password won't change until you create a new one.",
  },
  hr: {
    subject: 'Resetirajte svoju lozinku',
    heading: 'Zahtjev za resetiranje lozinke',
    body: 'Primili smo zahtjev za resetiranje vaše lozinke.',
    buttonText: 'Resetiraj Lozinku',
    linkText: 'Ili kopirajte i zalijepite ovaj link u svoj preglednik:',
    expiryText: 'Ovaj link će isteći za 1 sat.',
    ignoreText: 'Ako niste zatražili resetiranje lozinke, molimo ignorirajte ovaj email. Vaša lozinka neće biti promijenjena dok ne kreirate novu.',
  },
  de: {
    subject: 'Setzen Sie Ihr Passwort zurück',
    heading: 'Anfrage zum Zurücksetzen des Passworts',
    body: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.',
    buttonText: 'Passwort zurücksetzen',
    linkText: 'Oder kopieren Sie diesen Link in Ihren Browser:',
    expiryText: 'Dieser Link läuft in 1 Stunde ab.',
    ignoreText: 'Wenn Sie kein Zurücksetzen des Passworts angefordert haben, ignorieren Sie bitte diese E-Mail. Ihr Passwort wird erst geändert, wenn Sie ein neues erstellen.',
  },
  it: {
    subject: 'Reimposta la tua password',
    heading: 'Richiesta di reimpostazione password',
    body: 'Abbiamo ricevuto una richiesta per reimpostare la tua password.',
    buttonText: 'Reimposta Password',
    linkText: 'Oppure copia e incolla questo link nel tuo browser:',
    expiryText: 'Questo link scadrà tra 1 ora.',
    ignoreText: "Se non hai richiesto la reimpostazione della password, ignora questa email. La tua password non verrà modificata finché non ne creerai una nuova.",
  },
};

export function getVerificationEmailTemplate(
  lang: string = 'en',
): VerificationEmailContent {
  return verificationTemplates[lang] || verificationTemplates.en;
}

export function getPasswordResetEmailTemplate(
  lang: string = 'en',
): PasswordResetEmailContent {
  return passwordResetTemplates[lang] || passwordResetTemplates.en;
}

export function buildVerificationEmailHtml(
  verificationUrl: string,
  lang: string = 'en',
): { subject: string; html: string; text: string } {
  const template = getVerificationEmailTemplate(lang);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${template.heading}</h2>
      <p>${template.body}</p>
      <p>Click the button below to verify your email:</p>
      <a href="${verificationUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        ${template.buttonText}
      </a>
      <p>${template.linkText}</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p style="margin-top: 30px; color: #999; font-size: 12px;">
        ${template.expiryText}
      </p>
    </div>
  `;

  const text = `${template.heading} ${template.body} ${verificationUrl} ${template.expiryText}`;

  return { subject: template.subject, html, text };
}

export function buildPasswordResetEmailHtml(
  resetUrl: string,
  lang: string = 'en',
): { subject: string; html: string; text: string } {
  const template = getPasswordResetEmailTemplate(lang);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${template.heading}</h2>
      <p>${template.body}</p>
      <a href="${resetUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        ${template.buttonText}
      </a>
      <p>${template.linkText}</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p style="margin-top: 30px; color: #999; font-size: 12px;">
        ${template.expiryText}
      </p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">
        ${template.ignoreText}
      </p>
    </div>
  `;

  const text = `${template.heading} ${template.body} ${resetUrl} ${template.expiryText} ${template.ignoreText}`;

  return { subject: template.subject, html, text };
}
