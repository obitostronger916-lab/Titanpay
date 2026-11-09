import { useEffect, useState } from "react";
import { api, fmt } from "../api";
import type { Me, Nav } from "../App";

type Product = { id: number; name: string; description: string; price: number; image_url: string | null; category: string };

export default function Shop({ me, refresh, go }: { me: Me; refresh: () => void; go: Nav }) {
  const [items, setItems] = useState<Product[]>([]);
  const [cat, setCat] = useState("Hammasi");
  const [sel, setSel] = useState<Product | null>(null);
  const [nick, setNick] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<Product[]>("/api/products").then(setItems).catch((e) => setErr(e.message)); }, []);

  const cats = ["Hammasi", ...Array.from(new Set(items.map((i) => i.category)))];
  const shown = cat === "Hammasi" ? items : items.filter((i) => i.category === cat);

  async function buy() {
    if (!sel) return;
    setBusy(true); setErr("");
    try {
      const o = await api("/api/orders", "POST", { product_id: sel.id, game_nick: nick });
      setDone(`Buyurtma #${o.id} qabul qilindi`);
      setSel(null); setNick("");
      refresh();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      {done && <div className="ok">{done} — <a style={{ color: "#d4af37" }} onClick={() => go("orders")}>Buyurtmalar</a></div>}
      {err && !sel && <div className="err">{err}</div>}
      <div className="chips">
        {cats.map((c) => (
          <button key={c} className={`chip ${c === cat ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      {shown.length === 0 && <div className="muted">Hozircha mahsulotlar yo'q.</div>}
      {shown.map((p) => (
        <div className="card" key={p.id}>
          {p.image_url && <img className="pimg" src={p.image_url} alt={p.name} />}
          <div className="row"><b>{p.name}</b><span className="price">{fmt(p.price)}</span></div>
          {p.description && <div className="muted" style={{ margin: "6px 0 10px" }}>{p.description}</div>}
          <button className="btn" onClick={() => { setSel(p); setErr(""); setDone(""); }}>Xarid qilish</button>
        </div>
      ))}
      {sel && (
        <div className="modal" onClick={() => setSel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="gold">{sel.name}</h3>
            <div className="row"><span>Narxi</span><span className="price">{fmt(sel.price)}</span></div>
            <div className="row" style={{ marginBottom: 10 }}><span>Balansingiz</span><span>{fmt(me.balance)}</span></div>
            <input placeholder="O'yindagi nik" value={nick} onChange={(e) => setNick(e.target.value)} />
            {err && <div className="err">{err}</div>}
            {me.balance < sel.price ? (
              <button className="btn" onClick={() => go("topup")}>Balansni to'ldirish</button>
            ) : (
              <button className="btn" disabled={busy || nick.trim().length < 2} onClick={buy}>
                {busy ? "Kuting…" : "Tasdiqlash"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
