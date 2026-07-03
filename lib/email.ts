const SENDER = { name: "Veredoc", email: "noreply@veredoc.it" };

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `https://veredoc.it/reset-password?token=${token}`;

  const textContent = `Ciao,

Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Veredoc.

Per procedere, apri questo link:
${resetUrl}

Se non hai richiesto tu il reset, ignora questa email. Il link scade tra un'ora.

Il team Veredoc`;

  const htmlContent = textContent
    .split("\n")
    .map((line) => (line ? `<p>${line}</p>` : ""))
    .join("\n");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY as string,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: to }],
      subject: "Reimposta la tua password Veredoc",
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Errore invio email Brevo (status ${res.status}):`, body);
  }
}
