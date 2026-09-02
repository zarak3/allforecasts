import { EmailIcon, XIcon, InstagramIcon } from "@/components/SocialIcons";

export default function Footer() {
  return (
    <footer className="border-t border-line py-10 font-mono text-xs text-ink-soft">
      <div className="max-w-4xl mx-auto px-6">
        <p className="max-w-2xl mb-4">
          Nothing on this site is financial advice. Forecasts are probabilistic estimates for
          informational and illustrative purposes only, built from public data sources with
          attribution (World Bank, ONS, WHO, UNESCO). Do not make investment or financial
          decisions based on this content.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a
            href="mailto:hello@allforecasts.com"
            className="text-ink-soft hover:text-accent inline-flex items-center gap-1.5"
          >
            <EmailIcon size={16} />
            hello@allforecasts.com
          </a>
          <a
            href="https://x.com/allforecast"
            className="text-ink-soft hover:text-accent inline-flex items-center gap-1.5"
          >
            <XIcon size={13} />
            @allforecast
          </a>
          <a
            href="https://instagram.com/allforecast"
            className="text-ink-soft hover:text-accent inline-flex items-center gap-1.5"
          >
            <InstagramIcon size={17} />
            @allforecast
          </a>
        </div>
      </div>
    </footer>
  );
}
