
import { useCallback, useEffect, useState } from "react";
import { api, tg, fmt } from "./api";
import Shop from "./pages/Shop";
import Topup from "./pages/Topup";
import { Balance, Orders, Profile, Rules } from "./pages/Simple";
import Support from "./pages/Support";
import Admin from "./pages/Admin";

export type Me = {
  id: number;
  name: string;
  balance: number;
  is_admin: boolean;
};

export type Nav = (page: string, ctx?: any) => void;

const TILES: [string, string, string][] = [
  ["shop", "🛒", "Donat do'koni"],
  ["balance", "💎", "Mening balansim"],
  ["topup", "➕", "Balansni to'ldirish"],
  ["orders", "📦", "Buyurtmalarim"],
  ["profile", "👤", "Mening profilim"],
  ["support", "🎧", "Yordam markazi"],
  ["rules", "📜", "Qoidalar"],
];

const ICONS: Record<string, string> = {
  shop: "🛒",
  balance: "💎",
  topup: "💳",
  orders: "📦",
  profile: "👤",
  support: "🎧",
  rules: "📜",
  admin: "⚙️",
};

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState("home");
  const [ctx, setCtx] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      setError("");
      setMe(await api<Me>("/api/me"));
    } catch (e: any) {
      setError(e?.message || "Ma'lumotlarni yuklashda xatolik");
    }
  }, []);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    refresh();
  }, [refresh]);

  const go: Nav = (p, c) => {
    setPage(p);
    setCtx(c ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const titles: Record<string, string> = Object.fromEntries(
    TILES.map(([key, , title]) => [key, title])
  );
  titles.admin = "Admin panel";

  if (error) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 className="gold">TITAN DONAT</h2>
          <p className="err">{error}</p>
          <p className="muted">
            Mini App'ni Telegram bot ichidagi tugma orqali oching.
          </p>
          <button className="btn" onClick={refresh}>
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="wrap">
        <div className="card" style={{ textAlign: "center", marginTop: 50 }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🌃</div>
          <h2 className="gold">TITAN DONAT</h2>
          <p className="muted">ONESTATE ROLEPLAY</p>
          <p className="muted">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      {page === "home" ? (
        <>
          <div
            className="row"
            style={{ marginBottom: 20, alignItems: "center" }}
          >
            <div>
              <div className="muted">ONESTATE ROLEPLAY</div>
              <h1 className="gold" style={{ margin: "4px 0" }}>
                TITAN DONAT
              </h1>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 15,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg,#263e60,#18243b)",
                border: "1px solid #42648b",
                fontSize: 25,
              }}
            >
              👑
            </div>
          </div>

          <div
            className="card balance-card"
            style={{ padding: 20, marginBottom: 18 }}
          >
            <div className="row">
              <div>
                <div className="muted">Xush kelibsiz,</div>
                <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>
                  {me.name || "O'yinchi"}
                </div>
              </div>
              <span className="badge">ONESTATE RP</span>
            </div>

            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,.12)",
                margin: "17px 0",
              }}
            />

            <div className="muted">Sizning balansingiz</div>
            <div className="big gold">{fmt(me.balance)}</div>
            <div className="muted" style={{ marginTop: 5 }}>
              UZS · Shaxsiy hisob
            </div>

            <button
              className="btn"
              style={{ marginTop: 17 }}
              onClick={() => go("topup")}
            >
              + Balansni to'ldirish
            </button>
          </div>

          <div className="row" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Xizmatlar</h2>
            <span className="muted">TITAN STORE</span>
          </div>

          <div className="grid">
            {TILES.map(([key, , title]) => (
              <button
                key={key}
                className="tile"
                onClick={() => go(key)}
              >
                <span className="ico">{ICONS[key]}</span>
                {title}
              </button>
            ))}

            {me.is_admin && (
              <button className="tile" onClick={() => go("admin")}>
                <span className="ico">{ICONS.admin}</span>
                Admin panel
              </button>
            )}
          </div>

          <div
            className="card"
            style={{
              marginTop: 17,
              textAlign: "center",
              background:
                "linear-gradient(120deg,rgba(54,185,255,.09),rgba(145,108,255,.09))",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>🏙️</div>
            <div style={{ fontWeight: 800 }}>ONESTATE ROLEPLAY</div>
            <div className="muted" style={{ marginTop: 5 }}>
              Your city. Your story.
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="header">
            <button className="back" onClick={() => go("home")}>
              ←
            </button>
            <h2 className="gold" style={{ margin: 0 }}>
              {titles[page] || "TITAN DONAT"}
            </h2>
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
    </div>
  );
}
