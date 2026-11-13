import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { api, tg, fmt } from "./api";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import Shop from "./pages/Shop";
import Topup from "./pages/Topup";
import { Balance, Orders, Profile, Rules } from "./pages/Simple";
import Support from "./pages/Support";
import Admin from "./pages/Admin";

export type Me = { id: number; name: string; balance: number; is_admin: boolean };
export type Nav = (page: string, ctx?: any) => void;

const TILES: [string, IconName, string][] = [
  ["shop", "shop", "Donat do‘koni"],
  ["balance", "wallet", "Balans"],
  ["topup", "plus", "Balansni to‘ldirish"],
  ["orders", "orders", "Buyurtmalar"],
  ["profile", "user", "Profil"],
  ["support", "support", "Yordam"],
  ["rules", "rules", "Qoidalar"],
];

const BOTTOM_NAV: [string, IconName, string][] = [
  ["home", "home", "Bosh sahifa"],
  ["shop", "shop", "Do‘kon"],
  ["orders", "history", "Tarix"],
  ["topup", "plus", "To‘ldirish"],
  ["profile", "user", "Profil"],
];

const SWIPE_MIN = 40;

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState("home");
  const [ctx, setCtx] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const bannerStart = useRef<{ x: number; y: number } | null>(null);
  const bannerWasSwiped = useRef(false);
  const [sharedBackground, setSharedBackground] = useState<string | null>(null);

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
    try {
      if (tg?.isVersionAtLeast?.("6.9")) {
        tg.setHeaderColor?.("#f5f5f5");
        tg.setBackgroundColor?.("#f5f5f5");
      }
    } catch {}
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!me) return;
    api<{ background_image: string | null }>("/api/app-settings")
      .then((settings) => setSharedBackground(settings.background_image || null))
      .catch(() => setSharedBackground(null));
    api<any[]>("/api/banners").then((items) => {
      setBanners(items || []);
      setBannerIndex(0);
    }).catch(() => setBanners([]));
  }, [me]);

  // Avtomatik almashish: barmoq tegib turganda to'xtaydi, surishdan keyin qayta sanaladi.
  useEffect(() => {
    if (banners.length < 2 || dragging) return;
    const timer = window.setTimeout(() => {
      setBannerIndex((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [banners.length, bannerIndex, dragging]);

  useEffect(() => {
    if (sharedBackground) {
      document.documentElement.style.setProperty("--shared-background-image", `url("${sharedBackground}")`);
    } else {
      document.documentElement.style.removeProperty("--shared-background-image");
    }
    return () => {
      document.documentElement.style.removeProperty("--shared-background-image");
    };
  }, [sharedBackground]);

  const current = banners.length ? bannerIndex % banners.length : 0;
  const slides: any[] = banners.length ? banners : [null];
  const changeBanner = (direction: number) =>
    setBannerIndex((c) => (c + direction + banners.length) % banners.length);

  const openBanner = (banner: any) => {
    if (bannerWasSwiped.current) {
      bannerWasSwiped.current = false;
      return;
    }
    if (banner?.target_url) {
      if (tg?.openLink) tg.openLink(banner.target_url);
      else window.open(banner.target_url, "_blank", "noopener,noreferrer");
    }
  };

  const onBannerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || banners.length < 2) return;
    bannerStart.current = { x: e.clientX, y: e.clientY };
    bannerWasSwiped.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onBannerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = bannerStart.current;
    if (!start || banners.length < 2) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) setDragging(true);
      else return;
    }
    setDragX(dx);
  };

  const onBannerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = bannerStart.current;
    bannerStart.current = null;
    if (!start) return;
    if (dragging) {
      const dx = e.clientX - start.x;
      bannerWasSwiped.current = true;
      if (Math.abs(dx) > SWIPE_MIN) changeBanner(dx < 0 ? 1 : -1);
    }
    setDragging(false);
    setDragX(0);
  };

  const onBannerCancel = () => {
    bannerStart.current = null;
    setDragging(false);
    setDragX(0);
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
        <h2>TITANPAY</h2>
        <p className="err">{error}</p>
        <p className="muted">Mini App’ni Telegram bot ichidagi tugma orqali oching.</p>
        <button className="btn small" onClick={refresh}>Qayta urinish</button>
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
        <div className="logo-stage"><div className="brand-mark splash-mark">T</div></div>
        <div className="splash-title">TITANPAY</div>
        <div className="splash-subtitle">ONESTATE RP DONAT XIZMATI</div>
        <div className="loading-line"><span /></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="wrap app-content">
        <div className="page" key={page}>
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
                <div className="online-pill">ONESTATE RP</div>
              </header>

              <section className="welcome-row">
                <div>
                  <div className="muted">Xush kelibsiz,</div>
                  <h1>{me.name || "O‘yinchi"}!</h1>
                </div>
                <div className="avatar-chip"><Icon name="user" /></div>
              </section>

              <section className="balance-card home-balance">
                <div className="eyebrow">Joriy balans</div>
                <div className="big">{fmt(me.balance)}</div>
                <div className="row">
                  <span className="muted">TITAN DONAT hisobi</span>
                  <button className="btn light small" onClick={() => go("topup")}>To‘ldirish</button>
                </div>
              </section>

              <div
                className="promo-slider"
                onPointerDown={onBannerDown}
                onPointerMove={onBannerMove}
                onPointerUp={onBannerUp}
                onPointerCancel={onBannerCancel}
              >
                <div
                  className={`promo-track ${dragging ? "dragging" : ""}`}
                  style={{ transform: `translateX(calc(${-current * 100}% + ${dragX}px))` }}
                >
                  {slides.map((b, i) => (
                    <div className="promo-slide" key={b?.id ?? i}>
                      <button
                        type="button"
                        className={`promo-banner ${b?.image_url ? "has-image" : ""}`}
                        onClick={() => openBanner(b)}
                      >
                        {b?.image_url && (
                          <img className="promo-image" src={b.image_url} alt={b.title || ""} draggable={false} />
                        )}
                        <span className="promo-shade" />
                        <span className="promo-copy">
                          <small>{b?.title || "ONESTATE RP"}</small>
                          <strong>{b?.text || "Donat paketlari va xizmatlar"}</strong>
                          {b?.target_url && <em>Batafsil</em>}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
                {banners.length > 1 && (
                  <div className="promo-dots" aria-hidden="true">
                    {banners.map((b, i) => (
                      <span key={b?.id ?? i} className={i === current ? "active" : ""} />
                    ))}
                  </div>
                )}
              </div>

              <section className="section-block">
                <div className="section-heading">
                  <div><span className="eyebrow">Tezkor kirish</span><h2>Kerakli bo‘lim</h2></div>
                </div>
                <div className="quick-grid">
                  <button className="quick-card" onClick={() => go("balance")}>
                    <span className="quick-icon"><Icon name="wallet" /></span>
                    <span className="q-title">Balans</span><small>Hisobingiz</small>
                  </button>
                  <button className="quick-card" onClick={() => go("orders")}>
                    <span className="quick-icon"><Icon name="orders" /></span>
                    <span className="q-title">Oxirgi xarid</span><small>Buyurtmalar</small>
                  </button>
                  <button className="quick-card" onClick={() => go("shop")}>
                    <span className="quick-icon"><Icon name="shop" /></span>
                    <span className="q-title">ONESTATE donat</span><small>Donat paketlari</small>
                  </button>
                  <button className="quick-card" onClick={() => go("support")}>
                    <span className="quick-icon"><Icon name="support" /></span>
                    <span className="q-title">Yordam</span><small>Support bilan aloqa</small>
                  </button>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div><span className="eyebrow">ONESTATE RP</span><h2>Donat paketlari</h2></div>
                  <button className="text-action" onClick={() => go("shop")}>Barchasi</button>
                </div>
                <button className="list-btn" onClick={() => go("shop")}>
                  <span className="list-icon dark"><Icon name="shop" /></span>
                  <span className="list-text"><strong>ONESTATE RP</strong><span>Donat va o‘yin xizmatlari</span></span>
                  <Icon name="chevron" className="list-chev" />
                </button>
                {me.is_admin && (
                  <button className="list-btn" onClick={() => go("admin")}>
                    <span className="list-icon"><Icon name="admin" /></span>
                    <span className="list-text"><strong>Admin panel</strong><span>Boshqaruv markazi</span></span>
                    <Icon name="chevron" className="list-chev" />
                  </button>
                )}
              </section>
            </>
          ) : (
            <>
              <div className="page-header">
                <button className="back" aria-label="Orqaga" onClick={() => { go("home"); refresh(); }}>
                  <Icon name="back" />
                </button>
                <h2 className="page-title">{titles[page] || "TITANPAY"}</h2>
              </div>
              {page === "shop" && <Shop me={me} refresh={refresh} go={go} />}
              {page === "balance" && <Balance me={me} />}
              {page === "topup" && <Topup go={go} />}
              {page === "orders" && <Orders go={go} />}
              {page === "profile" && <Profile me={me} go={go} />}
              {page === "support" && <Support ctx={ctx} />}
              {page === "rules" && <Rules />}
              {page === "admin" && me.is_admin && <Admin />}
            </>
          )}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Asosiy navigatsiya">
        {BOTTOM_NAV.map(([key, icon, label]) => (
          <button key={key} className={`nav-item ${page === key ? "active" : ""}`} onClick={() => go(key)}>
            <span className="nav-icon"><Icon name={icon} size={22} /></span><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
