import { useState, useEffect, useRef } from "react";
import { Newspaper } from "lucide-react";
import { apiBaseUrl } from "../../api/apiBaseUrl";
import { qrTiming, useZeitQr } from "../../api/zeitQr";
import { QrCode } from "../Company/QrCode";
import { LogoMark } from "../../design/primitives";
import { delay, prefersReducedMotion, tr, useNow } from "../../design/hooks";

interface NewsItemPart {
  pubDate: string;
  description: string;
  /** optional vom Backend: Quelle bzw. Link der Meldung */
  source?: string;
  link?: string;
}

interface LatestNewsProps {
  theme: "dark" | "light";
  language: string | null;
  /** true = Laufschrift anhalten (z. B. während der Werbung, spart Leistung) */
  paused?: boolean;
}

const LOCAL_STORAGE_KEY = "latest_news";

const readCachedNews = (): NewsItemPart[] => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    return cached ? (JSON.parse(cached) as NewsItemPart[]) : [];
  } catch {
    return [];
  }
};

/** News-Leiste als Glasfläche: Bildmarke · Eyebrow „News“ · Laufschrift mit weichen Rändern · Stempel-QR der Zeiterfassung */
const Footer = ({ language, paused = false }: LatestNewsProps) => {
  const [newsData, setNewsData] = useState<NewsItemPart[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const stampQr = useZeitQr();
  const stampTiming = qrTiming(stampQr, useNow(1000).getTime());
  const stampQrShown = Boolean(stampQr.data) && !stampTiming.stale;

  useEffect(() => {
    const fetchNewsData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}kiosk_client_app.system_integration.doctype.news.news.get_latest_news`);
        const json = await response.json();
        const items: NewsItemPart[] = json?.message?.news_items ?? [];
        const filtered = items.filter((item) => item.description?.trim());
        if (filtered.length > 0) {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
          } catch (storageErr) {
            console.warn("News konnten nicht zwischengespeichert werden:", storageErr);
          }
        }
        setNewsData(filtered.length > 0 ? filtered : readCachedNews());
      } catch (err) {
        console.error("Error fetching news, loading from local storage", err);
        setNewsData(readCachedNews());
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNewsData();
    const interval = setInterval(fetchNewsData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Laufschrift mit konstanter, gut lesbarer Geschwindigkeit (px/s) – unabhängig von der Textlänge
  const trackRef = useRef<HTMLDivElement>(null);
  const [tickerSec, setTickerSec] = useState(120);
  const newsKey = newsData.map((n) => n.description).join("|");
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    const pxPerSec = Math.max(window.innerWidth, window.innerHeight) * 0.04; // ≈ 77 px/s auf Full-HD
    if (half > 0) setTickerSec(Math.max(20, half / pxPerSec));
  }, [newsKey]);

  // Reduzierte Bewegung: keine Laufschrift, sondern eine Meldung nach der anderen (alle 8 s)
  const [reduced] = useState(() => prefersReducedMotion());
  const [one, setOne] = useState(0);
  useEffect(() => {
    if (!reduced || newsData.length < 2) return;
    const id = setInterval(() => setOne((i) => (i + 1) % newsData.length), 8000);
    return () => clearInterval(id);
  }, [reduced, newsData.length]);

  const dateOf = (s: string) => {
    const d = new Date(s);
    return Number.isFinite(d.valueOf()) ? d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" }) : null;
  };
  const sourceOf = (n: NewsItemPart) => {
    if (n.source?.trim()) return n.source.trim();
    try {
      return n.link ? new URL(n.link).hostname.replace(/^www./, "") : null;
    } catch {
      return null;
    }
  };
  // Datum und Quelle erscheinen, sobald das Backend sie liefert
  const item = (news: NewsItemPart) => (
    <>
      {dateOf(news.pubDate) && <span className="mr-[0.6em] tabular text-[0.85em] font-semibold text-[#aed083]">{dateOf(news.pubDate)}</span>}
      <span className="text-white/90">{news.description}</span>
      {sourceOf(news) && <span className="ml-[0.6em] text-[0.8em] text-white/65">({sourceOf(news)})</span>}
    </>
  );
  const ticker = (prefix: string) =>
    newsData.map((news, index) => (
      <span key={`${prefix}-${index}`} className="inline-flex shrink-0 items-center">
        {item(news)}
        <span aria-hidden className="mx-[1.6em] inline-flex items-center gap-[0.35em]">
          <span className="size-[0.22em] rounded-full bg-white/25" />
          <span className="size-[0.42em] rotate-45 rounded-[0.08em] bg-[linear-gradient(135deg,#aed083,#669933)]" />
          <span className="size-[0.22em] rounded-full bg-white/25" />
        </span>
      </span>
    ));

  return (
    <footer
      className={`ov-scale ov-glass ov-enter-up relative flex ${paused ? "ov-calm" : ""} h-[calc(4.4vh+2.2vw)] shrink-0 items-stretch overflow-hidden rounded-3xl text-[calc(0.6vw+0.6vh)]`}
      style={delay(200)}
    >
      {/* Marke + Eyebrow */}
      <div className="relative z-10 flex shrink-0 items-center gap-[0.8em] bg-[linear-gradient(135deg,rgb(102_153_51/0.3),rgb(102_153_51/0.08))] pl-[1.1em] pr-[2.4em] [clip-path:polygon(0_0,100%_0,calc(100%-1.3em)_100%,0_100%)]">
        <LogoMark size={40} className="h-[2.3em] w-auto" />
        <div className="leading-tight">
          <div className="eyebrow">News</div>
          <div className="mt-[0.15em] whitespace-nowrap font-[var(--font-display)] text-[0.9em] font-extrabold tracking-tight text-white">
            {tr(language, {
              DE: "Aktuelle Meldungen",
              EN: "Latest news",
              IT: "Ultime notizie",
              FR: "Dernières actualités",
              SQ: "Lajmet e fundit",
            })}
          </div>
        </div>
      </div>

      {/* Laufschrift: Ausblendung beginnt erst hinter der schrägen Markenkante */}
      <div className="relative -ml-[1.3em] min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent_0,transparent_1.4em,black_4.2em,black_calc(100%-4.5em),transparent_calc(100%-0.6em))]">
        <div className="absolute inset-0 flex items-center">
          {newsLoading ? (
            <span className="ov-skeleton ml-[3em] h-[0.9em] w-[40%]" />
          ) : newsData.length > 0 && reduced ? (
            <div key={one} className="ov-fade line-clamp-2 pl-[3.4em] pr-[1em] text-[1em] font-medium leading-tight">
              {item(newsData[one % newsData.length])}
            </div>
          ) : newsData.length > 0 ? (
            <div
              ref={trackRef}
              className="ov-ticker flex whitespace-nowrap pl-[3.4em] text-[1.12em] font-medium tracking-[-0.005em]"
              style={{ animationDuration: `${tickerSec}s` }}
            >
              {ticker("a")}
              {ticker("b")}
            </div>
          ) : (
            <span className="inline-flex items-center gap-[0.6em] pl-[3.4em] text-white/65">
              <Newspaper className="size-[1.1em]" />
              {tr(language, {
                DE: "Keine Nachrichten verfügbar",
                EN: "No news available",
                IT: "Nessuna notizia disponibile",
                FR: "Aucune actualité disponible",
                SQ: "Nuk ka lajme",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Stempel-QR der Zeiterfassung (ersetzt den Website-QR) – derselbe rotierende Code wie am Empfang */}
      <div className="flex shrink-0 items-center gap-[0.8em] border-l border-white/10 pl-[1.1em] pr-[0.6em]">
        <span className="text-right text-[0.8em] leading-tight text-white/70">
          {tr(language, { DE: "Zeiterfassung", EN: "Time tracking", IT: "Rilevazione presenze", FR: "Pointage", SQ: "Regjistrimi i kohës" })}
          <br />
          <span className={`font-semibold ${stampQrShown ? "text-white" : "text-[#ffd873]"}`}>
            {stampQrShown
              ? tr(language, { DE: `Stempeln · ${stampTiming.secs} s`, EN: `Clock in · ${stampTiming.secs} s`, IT: `Timbra · ${stampTiming.secs} s`, FR: `Pointer · ${stampTiming.secs} s`, SQ: `Regjistrohu · ${stampTiming.secs} s` })
              : stampQr.error === "not_configured"
                ? tr(language, { DE: "nicht verbunden (Schlüssel fehlt)", EN: "not connected (key missing)" })
                : stampQr.error === "unauthorized"
                  ? tr(language, { DE: "Schlüssel abgelehnt", EN: "key rejected" })
                  : tr(language, { DE: "QR nicht verfügbar", EN: "QR unavailable", IT: "QR non disponibile", FR: "QR indisponible", SQ: "QR i padisponueshëm" })}
          </span>
        </span>
        <span className="rounded-[10px] bg-white p-[0.22em] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
          {stampQrShown ? (
            <span key={stampQr.data!.token} className="ov-fade block">
              <QrCode
                value={stampQr.data!.scan_url}
                label={tr(language, { DE: "QR-Code zum Stempeln mit der ÖKOVOLT-App", EN: "QR code for clocking in with the ÖKOVOLT app" })}
                className="block size-[calc(3.2vh+1.4vw)]"
              />
            </span>
          ) : (
            <span className="block size-[calc(3.2vh+1.4vw)] animate-pulse rounded-[6px] bg-neutral-200" />
          )}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
