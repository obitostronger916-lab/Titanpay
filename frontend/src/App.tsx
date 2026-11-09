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
  ["shop", "🛒", "Donat do'koni"],
  ["balance", "💰", "Balans"],
  ["topup", "➕", "Balansni to'ldirish"],
  ["orders", "📦", "Buyurtmalar"],
  ["profile", "👤", "Profil"],
  ["support", "🆘", "Support"],
  ["rules", "📜", "Qoidalar"],
];

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState("home");
  const [ctx, setCtx] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/me"));
    } catch (e: any) {
      setError(e.message);
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
    window.scrollTo(0, 0);
  };

  if (error)
    return (
      <div className="wrap">
        <h2 className="gold">TITAN DONAT</h2>
        <p className="err">{error}</p>
        <p className="muted">Mini App'ni Telegram bot ichidagi tugma orqali oching.</p>
      </div>
    );
  if (!me) return <div className="wrap muted">Yuklanmoqda…</div>;

  const titles: Record<string, string> = Object.fromEntries(TILES.map(([k, , t]) => [k, t]));
  titles.admin = "Admin panel";

  return (
    <div className="wrap">
      {page === "home" ? (
        <>
          <h1 className="gold">👑 TITAN DONAT</h1>
          <div className="muted" style={{ marginBottom: 10 }}>ONESTATE RP</div>
          <div className="card balance-card">
            <div className="muted">Salom, {me.name || "o'yinchi"}</div>
            <div className="big gold">{fmt(me.balance)}</div>
          </div>
          <div className="grid">
            {TILES.map(([k, ico, t]) => (
              <button key={k} className="tile" onClick={() => go(k)}>
                <span className="ico">{ico}</span>{t}
              </button>
            ))}
            {me.is_admin && (
              <button className="tile" onClick={() => go("admin")}>
                <span className="ico">⚙️</span>Admin panel
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="header">
            <button className="back" onClick={() => { go("home"); refresh(); }}>←</button>
            <h2 className="gold" style={{ margin: 0 }}>{titles[page]}</h2>
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
