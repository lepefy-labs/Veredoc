import { Resend } from "resend";

const FROM = "Veredoc <noreply@veredoc.it>";

export async function sendPasswordResetEmail(to: string, token: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const resetUrl = `https://veredoc.it/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reimposta la tua password Veredoc",
    text: `Ciao,

Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Veredoc.

Per procedere, apri questo link:
${resetUrl}

Se non hai richiesto tu il reset, ignora questa email. Il link scade tra un'ora.

Il team Veredoc`,
  });
}
