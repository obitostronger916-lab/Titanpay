
import { useEffect, useState } from "react";
import { api, fmt } from "../api";
import type { Me, Nav } from "../App";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
};

export default function Shop({
  me,
  refresh,
  go,
}: {
  me: Me;
  refresh: () => void;
  go: Nav;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [cat, setCat] = useState("Hammasi");
  const [sel, setSel] = useState<Product | null>(null);
  const [nick, setNick] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Product[]>("/api/products")
      .then(setItems)
      .catch((e) => setErr(e.message || "Mahsulotlarni yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  }, []);

  const cats = [
    "Hammasi",
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
  ];

  const shown =
    cat === "Hammasi" ? items : items.filter((i) => i.category === cat);

  async function buy() {
    if (!sel || busy) return;

    if (nick.trim().length < 2) {
      setErr("O'yindagi nikni to'g'ri kiriting.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const o = await api<{ id: number }>("/api/orders", "POST", {
        product_id: sel.id,
        game_nick: nick.trim(),
      });

      setDone(`Buyurtma #${o.id} qabul qilindi`);
      setSel(null);
      setNick("");
      refresh();
    } catch (e: any) {
      setErr(e?.message || "Xarid amalga oshmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 17 }}>
        <div className="muted">ONESTATE ROLEPLAY</div>
        <h2 style={{ margin: "5px 0" }}>Donat do'koni 🛒</h2>
        <div className="muted">
          Kerakli paketni tanlang va buyurtma bering.
        </div>
      </div>

      <div
        className="card"
        style={{
          background:
            "linear-gradient(120deg,rgba(54,185,255,.13),rgba(145,108,255,.13))",
        }}
      >
        <div className="row">
          <div>
            <div className="muted">Mavjud balans</div>
            <div className="big gold">{fmt(me.balance)}</div>
          </div>
          <div style={{ fontSize: 35 }}>💎</div>
        </div>
        <button
          className="btn ghost"
          style={{ marginTop: 12 }}
          onClick={() => go("topup")}
        >
          + Balansni to'ldirish
        </button>
      </div>

      {done && (
        <div className="card">
          <div className="ok">✓ {done}</div>
          <button
            className="btn ghost"
            onClick={() => {
              setDone("");
              go("orders");
            }}
          >
            Buyurtmalarni ko'rish
          </button>
        </div>
      )}

      {err && !sel && <div className="err">{err}</div>}

      <div className="row" style={{ margin: "18px 0 10px" }}>
        <h3 style={{ margin: 0 }}>Paketlar</h3>
        <span className="muted">{items.length} ta mahsulot</span>
      </div>

      <div className="chips">
        {cats.map((c) => (
          <button
            key={c}
            className={`chip ${c === cat ? "on" : ""}`}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card muted" style={{ textAlign: "center" }}>
          Mahsulotlar yuklanmoqda...
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 25 }}>
          <div style={{ fontSize: 35 }}>🏙️</div>
          <b>Hozircha mahsulotlar yo'q</b>
          <p className="muted">Yangi paketlar tez orada qo'shiladi.</p>
        </div>
      )}

      <div className="grid">
        {shown.map((p) => (
          <div
            className="card"
            key={p.id}
            style={{
              margin: 0,
              padding: 11,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {p.image_url ? (
              <img className="pimg" src={p.image_url} alt={p.name} />
            ) : (
              <div
                className="pimg"
                style={{
                  display: "grid",
                  placeItems: "center",
                  fontSize: 42,
                  background:
                    "linear-gradient(135deg,#1b3655,#222044)",
                }}
              >
                💎
              </div>
            )}

            <div className="badge" style={{ alignSelf: "flex-start" }}>
              {p.category || "Donat"}
            </div>

            <b style={{ margin: "9px 0 5px" }}>{p.name}</b>

            {p.description && (
              <div className="muted" style={{ marginBottom: 10 }}>
                {p.description}
              </div>
            )}

            <div style={{ marginTop: "auto" }}>
              <div className="price" style={{ marginBottom: 10 }}>
                {fmt(p.price)}
              </div>
              <button
                className="btn"
                onClick={() => {
                  setSel(p);
                  setErr("");
                  setDone("");
                }}
              >
                Tanlash
              </button>
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div
          className="modal"
          onClick={() => {
            if (!busy) setSel(null);
          }}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                width: 42,
                height: 4,
                borderRadius: 10,
                background: "#526780",
                margin: "0 auto 18px",
              }}
            />

            <div className="muted">TANLANGAN MAHSULOT</div>
            <h3 className="gold" style={{ marginTop: 7 }}>
              {sel.name}
            </h3>

            <div className="card">
              <div className="row">
                <span className="muted">Mahsulot narxi</span>
                <b className="price">{fmt(sel.price)}</b>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <span className="muted">Sizning balansingiz</span>
                <b>{fmt(me.balance)}</b>
              </div>
            </div>

            <label
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 8,
                color: "var(--muted)",
              }}
            >
              ONESTATE RP o'yinidagi nik
            </label>

            <input
              placeholder="Masalan: Player_Name"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              disabled={busy}
            />

            {err && <div className="err">{err}</div>}

            {me.balance < sel.price ? (
              <button
                className="btn"
                onClick={() => {
                  setSel(null);
                  go("topup");
                }}
              >
                Balansni to'ldirish
              </button>
            ) : (
              <button
                className="btn"
                disabled={busy || nick.trim().length < 2}
                onClick={buy}
              >
                {busy ? "Buyurtma yuborilmoqda..." : "Xaridni tasdiqlash"}
              </button>
            )}

            <button
              className="btn ghost"
              style={{ marginTop: 9 }}
              disabled={busy}
              onClick={() => setSel(null)}
            >
              Bekor qilish
            </button>

            <p className="muted" style={{ textAlign: "center", marginTop: 12 }}>
              Buyurtma holatini Buyurtmalar bo'limidan tekshirishingiz mumkin.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
