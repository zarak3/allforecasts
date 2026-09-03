// Real email sending via Resend. Uses the default sandbox sender
// (onboarding@resend.dev) rather than a verified allforecasts.com domain --
// that sender can only deliver to the account owner's own verified email,
// which is exactly this digest's one recipient, and skips the DNS
// verification setup a custom domain would need for a feature this small.
export async function sendEmail(apiKey: string, to: string, subject: string, text: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: "AllForecasts <onboarding@resend.dev>", to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
}
