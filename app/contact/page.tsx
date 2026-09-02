export const metadata = { title: "Contact — AllForecasts" };

const LINKS = [
  {
    label: "Email",
    value: "hello@allforecasts.com",
    href: "mailto:hello@allforecasts.com",
  },
  {
    label: "X",
    value: "@allforecast",
    href: "https://x.com/allforecast",
  },
  {
    label: "Instagram",
    value: "@allforecast",
    href: "https://instagram.com/allforecast",
  },
];

export default function ContactPage() {
  return (
    <main className="section pt-16">
      <div className="max-w-2xl mx-auto px-6">
        <div className="eyebrow mb-3">Get in touch</div>
        <h1 className="text-3xl font-medium mb-10">Contact</h1>

        <div className="flex flex-col gap-4">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="card p-6 flex items-center justify-between no-underline hover:opacity-80 transition"
            >
              <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                {link.label}
              </span>
              <span className="font-mono text-lg text-ink">{link.value}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
