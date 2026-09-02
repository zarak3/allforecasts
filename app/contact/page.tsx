import { EmailIcon, XIcon, InstagramIcon } from "@/components/SocialIcons";

export const metadata = { title: "Contact — AllForecasts" };

const LINKS = [
  {
    label: "Email",
    value: "hello@allforecasts.com",
    href: "mailto:hello@allforecasts.com",
    Icon: EmailIcon,
  },
  {
    label: "X",
    value: "@allforecast",
    href: "https://x.com/allforecast",
    Icon: XIcon,
  },
  {
    label: "Instagram",
    value: "@allforecast",
    href: "https://instagram.com/allforecast",
    Icon: InstagramIcon,
  },
];

const VALUES = [
  {
    title: "We only publish what we can defend",
    detail: "Every forecast is dated and public before we know if it's right, and checked against what actually happened.",
  },
  {
    title: "Real data, not guesses",
    detail: "Every number comes from a real public source or a calculation you could redo yourself — never invented.",
  },
  {
    title: "Honest about uncertainty",
    detail: "We give ranges, not false precision, and say plainly when something is a rough model rather than a researched call.",
  },
  {
    title: "Track record over hype",
    detail: "We'd rather be right less often and prove it than sound confident about everything.",
  },
];

export default function ContactPage() {
  return (
    <main className="section pt-16">
      <div className="max-w-2xl mx-auto px-6">
        <div className="eyebrow mb-3">Get in touch</div>
        <h1 className="text-3xl font-medium mb-10">Contact</h1>

        <div className="flex flex-col gap-4 mb-14">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="card p-6 flex items-center justify-between no-underline hover:opacity-80 transition"
            >
              <span className="font-mono text-xs uppercase tracking-wide text-ink-soft inline-flex items-center gap-2">
                <link.Icon size={18} />
                {link.label}
              </span>
              <span className="font-mono text-lg text-ink">{link.value}</span>
            </a>
          ))}
        </div>

        <h2 className="section-title mb-5">How we work</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {VALUES.map((v) => (
            <div key={v.title}>
              <h3 className="text-base font-medium mb-1.5">{v.title}</h3>
              <p className="text-ink-soft text-sm">{v.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
