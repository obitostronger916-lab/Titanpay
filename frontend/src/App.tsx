import { useCallback, useEffect, useState } from "react";
import { api, tg, fmt } from "./api";
import Shop from "./pages/Shop";
import Topup from "./pages/Topup";
import { Balance, Orders, Profile, Rules } from "./pages/Simple";
import Support from "./pages/Support";
import Admin from "./pages/Admin";

export type Me = { id: number; name: string; balance: number; is_admin: boolean };
export type Nav = (page: string, ctx?: any) => void;

const TILES: [string, string, string][] = [
  ["shop", "🛒", "Donat do‘koni"],
  ["balance", "💳", "Balans"],
  ["topup", "➕", "Balansni to‘ldirish"],
  ["orders", "🧾", "Buyurtmalar"],
  ["profile", "👤", "Profil"],
  ["support", "🎧", "Yordam"],
  ["rules", "📋", "Qoidalar"],
];

const BOTTOM_NAV: [string, string, string][] = [
  ["home", "⌂", "Bosh sahifa"],
  ["shop", "💎", "Donat do‘koni"],
  ["orders", "◷", "Tarix"],
  ["topup", "+", "To‘ldirish"],
  ["profile", "👤", "Profil"],
];

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState("home");
  const [ctx, setCtx] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/me"));
      setError("");
    } catch (e: any) {
      setError(e?.message || "Ma’lumotlarni yuklab bo‘lmadi");
    }
  }, []);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!me) return;
    api<any[]>("/api/banners").then((items) => {
      setBanners(items || []);
      setBannerIndex(0);
    }).catch(() => setBanners([]));
  }, [me]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const activeBanner = banners.length ? banners[bannerIndex % banners.length] : null;
  const changeBanner = (direction: number) => setBannerIndex((current) => (current + direction + banners.length) % banners.length);

  const openBanner = () => {
    if (activeBanner?.target_url) {
      if (tg?.openLink) tg.openLink(activeBanner.target_url);
      else window.open(activeBanner.target_url, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    if (!me) return;
    const timer = window.setTimeout(() => setShowSplash(false), 1900);
    return () => window.clearTimeout(timer);
  }, [me]);

  const go: Nav = (nextPage, nextCtx) => {
    setPage(nextPage);
    setCtx(nextCtx ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const titles: Record<string, string> = Object.fromEntries(
    TILES.map(([key, , title]) => [key, title])
  );
  titles.admin = "Admin panel";

  if (error) {
    return (
      <div className="wrap error-screen">
        <div className="brand-mark small-mark">T</div>
        <h2 className="neon-text">TITANPAY</h2>
        <p className="err">{error}</p>
        <p className="muted">Mini App’ni Telegram bot ichidagi tugma orqali oching.</p>
        <button className="primary-btn" onClick={refresh}>Qayta urinish</button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="loading-screen">
        <div className="brand-mark loading-mark">T</div>
        <div className="loading-line"><span /></div>
        <p className="muted">TITANPAY yuklanmoqda…</p>
      </div>
    );
  }

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-glow" />
        <div className="logo-stage">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="brand-mark splash-mark">T</div>
          <span className="spark spark-one" />
          <span className="spark spark-two" />
          <span className="spark spark-three" />
        </div>
        <div className="splash-title">TITAN<span>PAY</span></div>
        <div className="splash-subtitle">ONESTATE ROLEPLAY</div>
        <div className="loading-line splash-loading"><span /></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="wrap app-content">
        {page === "home" ? (
          <>
            <header className="home-header">
              <div className="brand-lockup">
                <div className="brand-mark header-mark">T</div>
                <div>
                  <div className="brand-name">TITAN<span>PAY</span></div>
                  <div className="muted brand-caption">ONESTATE ROLEPLAY</div>
                </div>
              </div>
              <div className="online-pill"><i /> ONLINE</div>
            </header>

            <section className="welcome-row">
              <div>
                <div className="muted">Xush kelibsiz,</div>
                <h1>{me.name || "O‘yinchi"}!</h1>
              </div>
              <div className="avatar-chip">⚡</div>
            </section>

            <div className="promo-slider">
              <button className={`promo-banner ${activeBanner?.image_url ? "has-image" : ""}`} onClick={openBanner}>
                {activeBanner?.image_url && <img className="promo-image" src={activeBanner.image_url} alt={activeBanner.title} />}
                <span className="promo-orb">✦</span>
                <span className="promo-copy">
                  <small>{activeBanner?.title || "ONESTATE RP"}</small>
                  <strong>{activeBanner?.text || "O‘YININGIZNI YANGI DARAJAGA OLIB CHIQING"}</strong>
                  {activeBanner?.target_url && <em>Batafsil ko‘rish ↗</em>}
                </span>
                <span className="promo-arrow">›</span>
              </button>
              {banners.length > 1 && (
                <div className="promo-controls" aria-label="Reklama bannerlari">
                  <button className="promo-step" aria-label="Oldingi reklama" onClick={() => changeBanner(-1)}>‹</button>
                  <div className="promo-dots">
                    {banners.map((banner, index) => (
                      <button key={banner.id} aria-label={`Banner ${index + 1}`}
                        className={index === bannerIndex ? "active" : ""}
                        onClick={() => setBannerIndex(index)} />
                    ))}
                  </div>
                  <span className="promo-count">{(bannerIndex % banners.length) + 1}/{banners.length}</span>
                  <button className="promo-step" aria-label="Keyingi reklama" onClick={() => changeBanner(1)}>›</button>
                </div>
              )}
            </div>

            <section className="section-block">
              <div className="section-heading">
                <div><span className="eyebrow">TEZKOR KIRISH</span><h2>Kerakli bo‘lim</h2></div>
              </div>
              <div className="quick-grid">
                <button className="quick-card" onClick={() => go("balance")}>
                  <span className="quick-icon">◈</span><span>Balans</span><small>Hisobingiz</small>
                </button>
                <button className="quick-card" onClick={() => go("orders")}>
                  <span className="quick-icon">▤</span><span>Oxirgi xarid</span><small>Buyurtmalar</small>
                </button>
                <button className="quick-card" onClick={() => go("shop")}>
                  <span className="quick-icon">💎</span><span>ONESTATE donat</span><small>Donat paketlari</small>
                </button>
                <button className="quick-card" onClick={() => go("support")}>
                  <span className="quick-icon">⌁</span><span>Yordam</span><small>Support bilan aloqa</small>
                </button>
              </div>
            </section>

            <section className="section-block games-section">
              <div className="section-heading">
                <div><span className="eyebrow">ONESTATE RP</span><h2>Donat paketlari</h2></div>
                <button className="text-action" onClick={() => go("shop")}>Barchasi ↗</button>
              </div>
              <button className="game-card" onClick={() => go("shop")}>
                <div className="game-icon">🎮</div>
                <div className="game-info"><strong>ONESTATE RP</strong><span>Donat va o‘yin xizmatlari</span></div>
                <span className="game-arrow">→</span>
              </button>
            </section>

            {me.is_admin && (
              <button className="admin-shortcut" onClick={() => go("admin")}>⚙ Admin panel</button>
            )}
          </>
        ) : (
          <>
            <div className="header page-header">
              <button className="back" onClick={() => { go("home"); refresh(); }}>←</button>
              <h2 className="neon-text" style={{ margin: 0 }}>{titles[page] || "TITANPAY"}</h2>
            </div>
            {page === "shop" && <Shop me={me} refresh={refresh} go={go} />}
            {page === "balance" && <Balance me={me} />}
            {page === "topup" && <Topup go={go} />}
            {page === "orders" && <Orders go={go} />}
            {page === "profile" && <Profile me={me} />}
            {page === "support" && <Support ctx={ctx} />}
            {page === "rules" && <Rules />}
            {page === "admin" && me.is_admin && <Admin />}
          </>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Asosiy navigatsiya">
        {BOTTOM_NAV.map(([key, icon, label]) => (
          <button key={key} className={`nav-item ${page === key ? "active" : ""}`} onClick={() => go(key)}>
            <span className="nav-icon">{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
