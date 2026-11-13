import { useEffect, useState } from "react";
import type { FocusEvent } from "react";
import { api, fmt } from "../api";
import { Icon } from "../icons";
import type { Me, Nav } from "../App";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
};

// Klaviatura ochilganda maydon ko'rinib turishi uchun
const focusIntoView = (e: FocusEvent<HTMLElement>) => {
  const el = e.currentTarget;
  window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
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
  const [clientId, setClientId] = useState("");
  const [privacyId, setPrivacyId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [server, setServer] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const servers = ["LOMITA CIS", "HILLS CIS", "LYNWOOD CIS", "BELL CIS", "COVINA CIS", "GLENDALE CIS"];
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

    if (!clientId.trim() || !privacyId.trim() || !characterName.trim() || !server) {
      setErr("Barcha ONESTATE RP ma'lumotlarini to'ldiring.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const o = await api<{ id: number }>("/api/orders", "POST", {
        product_id: sel.id,
        client_id: clientId.trim(),
        privacy_id: privacyId.trim(),
        character_name: characterName.trim(),
        server,
      });

      setDone(`Buyurtma #${o.id} qabul qilindi`);
      setSel(null);
      setClientId("");
      setPrivacyId("");
      setCharacterName("");
      setServer("");
      refresh();
    } catch (e: any) {
      setErr(e?.message || "Xarid amalga oshmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-l">
        <div className="eyebrow">ONESTATE ROLEPLAY</div>
        <h2 className="mt-s mb-s">Donat do'koni</h2>
        <div className="muted">
          Kerakli paketni tanlang va buyurtma bering.
        </div>
      </div>

      {done && (
        <div className="card strong">
          <div className="ok m0 mb-m">
            <Icon name="check" size={16} /> {done}
          </div>
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

      <div className="row mt-l mb-m">
        <h3 className="m0">Paketlar</h3>
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
        <div className="card state">
          <div className="loading-line" style={{ margin: "0 auto 10px" }}><span /></div>
          Mahsulotlar yuklanmoqda...
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="card state">
          <div className="state-icon"><Icon name="box" size={22} /></div>
          <b>Hozircha mahsulotlar yo'q</b>
          <p>Yangi paketlar tez orada qo'shiladi.</p>
        </div>
      )}

      <div className="grid">
        {shown.map((p) => (
          <div className="card product" key={p.id}>
            {p.image_url ? (
              <img className="pimg" src={p.image_url} alt={p.name} />
            ) : (
              <div className="pimg ph">
                <Icon name="shop" size={32} />
              </div>
            )}

            <div className="badge" style={{ alignSelf: "flex-start" }}>
              {p.category || "Donat"}
            </div>

            <b className="mt-s">{p.name}</b>

            {p.description && (
              <div className="muted mt-s">{p.description}</div>
            )}

            <div style={{ marginTop: "auto", paddingTop: 12 }}>
              <div className="price mb-s">{fmt(p.price)}</div>
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
            <div className="sheet-body">
              <div className="sheet-handle" />

              <div className="eyebrow">TANLANGAN MAHSULOT</div>
              <h3 className="mt-s mb-m">{sel.name}</h3>

              <div className="card">
                <div className="row">
                  <span className="muted">Mahsulot narxi</span>
                  <b className="price">{fmt(sel.price)}</b>
                </div>
                <div className="row mt-m">
                  <span className="muted">Sizning balansingiz</span>
                  <b>{fmt(me.balance)}</b>
                </div>
              </div>

              <div className="onestate-fields">
                <div className="row mb-s">
                  <b>ONESTATE RP akkaunt ma'lumotlari</b>
                  <button type="button" className="text-action" onClick={() => setShowHelp((v) => !v)}>Qayerdan olinadi?</button>
                </div>
                {showHelp && <div className="msg mb-m">1. O'yinda Settings bo'limini oching.<br />2. Account yoki Profile bo'limiga kiring.<br />3. Client ID va Privacy ID ma'lumotlarini topib nusxalang.<br />4. Character name — tanlangan serverdagi personaj nomi.</div>}
                <label htmlFor="f-client">Client ID *</label>
                <input id="f-client" placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} onFocus={focusIntoView} disabled={busy} autoComplete="off" />
                <label htmlFor="f-privacy">Privacy ID *</label>
                <input id="f-privacy" placeholder="Privacy ID" value={privacyId} onChange={(e) => setPrivacyId(e.target.value)} onFocus={focusIntoView} disabled={busy} autoComplete="off" />
                <label htmlFor="f-character">Character name *</label>
                <input id="f-character" placeholder="O'yindagi personaj nomi" value={characterName} onChange={(e) => setCharacterName(e.target.value)} onFocus={focusIntoView} disabled={busy} autoComplete="off" />
                <label htmlFor="f-server">Server *</label>
                <select id="f-server" value={server} onChange={(e) => setServer(e.target.value)} disabled={busy}>
                  <option value="">Serverni tanlang</option>
                  {servers.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              {err && <div className="err">{err}</div>}
            </div>

            <div className="sheet-foot">
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
                  disabled={busy || !clientId.trim() || !privacyId.trim() || !characterName.trim() || !server}
                  onClick={buy}
                >
                  {busy ? "Buyurtma yuborilmoqda..." : "Xaridni tasdiqlash"}
                </button>
              )}

              <button
                className="btn ghost"
                disabled={busy}
                onClick={() => setSel(null)}
              >
                Bekor qilish
              </button>

              <p className="muted m0" style={{ textAlign: "center" }}>
                Buyurtma holatini Buyurtmalar bo'limidan tekshirishingiz mumkin.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
