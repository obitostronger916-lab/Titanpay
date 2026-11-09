import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ } from "../api";

const TABS = ["Statistika", "To'lovlar", "Buyurtmalar", "Mahsulotlar", "Foydalanuvchilar", "Support", "Audit"];

export default function Admin() {
  const [tab, setTab] = useState(TABS[0]);
  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`chip ${t === tab ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === TABS[0] && <Stats />}
      {tab === TABS[1] && <Payments />}
      {tab === TABS[2] && <Orders />}
      {tab === TABS[3] && <Products />}
      {tab === TABS[4] && <Users />}
      {tab === TABS[5] && <Tickets />}
      {tab === TABS[6] && <Audit />}
    </>
  );
}

function useLoad(path: string) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const load = () => api(path).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [path]);
  return { data, err, load };
}

async function act(fn: () => Promise<any>, after: () => void) {
  try { await fn(); after(); } catch (e: any) { alert(e.message); }
}

function Stats() {
  const { data, err } = useLoad("/api/admin/stats");
  if (err) return <div className="err">{err}</div>;
  if (!data) return <div className="muted">Yuklanmoqda…</div>;
  const rows: [string, any][] = [
    ["Foydalanuvchilar", data.users],
    ["Jami to'ldirilgan", fmt(data.topups_total)],
    ["Navbatdagi buyurtmalar", data.orders_queued],
    ["Yetkazilgan buyurtmalar", data.orders_delivered],
    ["Tekshiruvdagi to'lovlar", data.payments_review],
    ["Ochiq murojaatlar", data.tickets_open],
  ];
  return <>{rows.map(([k, v]) => <div className="card row" key={k}><span className="muted">{k}</span><b className="price">{v}</b></div>)}</>;
}

function Payments() {
  const [filter, setFilter] = useState("mismatch");
  const { data, load } = useLoad(`/api/admin/payments?status=${filter}`);
  return (
    <>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        {["mismatch", "created", "credited", "mismatch_credited", "rejected"].map((s) => <option key={s} value={s}>{STATUS_UZ[s] || s}</option>)}
      </select>
      {(data || []).map((p: any) => (
        <div className="card" key={p.id}>
          <div className="row"><b>#{p.id}</b><span className="badge">{STATUS_UZ[p.status] || p.status}</span></div>
          <div className="muted">User {p.user_id} · kutilgan {fmt(p.expected)} · to'langan {p.paid != null ? fmt(p.paid) : "-"}</div>
          <div className="muted">TX: {p.tx || "-"}</div>
          {p.status === "mismatch" && (
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn small" onClick={() => confirm(`To'langan ${fmt(p.paid)} balansga qo'shilsinmi?`) && act(() => api(`/api/admin/payments/${p.id}/credit`, "POST"), load)}>Balansga qo'shish</button>
              <button className="btn red small" onClick={() => confirm("Rad etilsinmi?") && act(() => api(`/api/admin/payments/${p.id}/reject`, "POST"), load)}>Rad etish</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function Orders() {
  const [filter, setFilter] = useState("queued");
  const { data, load } = useLoad(`/api/admin/orders?status=${filter}`);
  return (
    <>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        {["queued", "processing", "delivered", "error"].map((s) => <option key={s} value={s}>{STATUS_UZ[s]}</option>)}
      </select>
      {(data || []).map((o: any) => (
        <div className="card" key={o.id}>
          <div className="row"><b>#{o.id}</b><span className="badge">{STATUS_UZ[o.status] || o.status}</span></div>
          <div>{o.product} · {fmt(o.price)}</div>
          <div className="muted">User {o.user_id} · nik: {o.nick}</div>
          {o.result && <div className="muted">{o.result}</div>}
          {o.status !== "delivered" && o.status !== "error" && (
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn ghost small" onClick={() => act(() => api(`/api/admin/orders/${o.id}/requeue`, "POST"), load)}>Qayta navbatga</button>
              <button className="btn red small" onClick={() => confirm("Pul balansga qaytarilsinmi?") && act(() => api(`/api/admin/orders/${o.id}/refund`, "POST"), load)}>Qaytarish</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

const EMPTY = { name: "", description: "", price: "", image_url: "", category: "Umumiy", in_stock: true, delivery_payload: "" };

function Products() {
  const { data, load } = useLoad("/api/admin/products");
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  function save() {
    const body = { ...form, price: parseInt(form.price, 10), image_url: form.image_url || null, delivery_payload: form.delivery_payload || null };
    act(() => (editId ? api(`/api/admin/products/${editId}`, "PUT", body) : api("/api/admin/products", "POST", body)),
      () => { setForm(EMPTY); setEditId(null); load(); });
  }

  return (
    <>
      <div className="card">
        <h3>{editId ? `Tahrirlash #${editId}` : "Yangi mahsulot"}</h3>
        <input placeholder="Nomi" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <textarea rows={2} placeholder="Tavsifi" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <input type="number" placeholder="Narxi (UZS)" value={form.price} onChange={(e) => set("price", e.target.value)} />
        <input placeholder="Rasm URL (https://...)" value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} />
        <input placeholder="Kategoriya" value={form.category} onChange={(e) => set("category", e.target.value)} />
        <input placeholder="Yetkazish ma'lumoti (API'ga yuboriladi: kod/miqdor)" value={form.delivery_payload || ""} onChange={(e) => set("delivery_payload", e.target.value)} />
        <label className="row" style={{ marginBottom: 10 }}>
          <span>Mavjud</span>
          <input type="checkbox" style={{ width: 24, margin: 0 }} checked={form.in_stock} onChange={(e) => set("in_stock", e.target.checked)} />
        </label>
        <button className="btn" disabled={!form.name || !(parseInt(form.price, 10) > 0)} onClick={save}>Saqlash</button>
        {editId && <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => { setForm(EMPTY); setEditId(null); }}>Bekor qilish</button>}
      </div>
      {(data || []).map((p: any) => (
        <div className="card" key={p.id} onClick={() => { setEditId(p.id); setForm({ ...p, price: String(p.price) }); window.scrollTo(0, 0); }}>
          <div className="row"><b>{p.name}</b><span className="price">{fmt(p.price)}</span></div>
          <div className="muted">{p.category} · {p.in_stock ? "mavjud" : "mavjud emas"}</div>
        </div>
      ))}
    </>
  );
}

function Users() {
  const { data, load } = useLoad("/api/admin/users");
  const [sel, setSel] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <>
      {(data || []).map((u: any) => (
        <div className="card" key={u.id} onClick={() => setSel(u)}>
          <div className="row"><b>{u.username ? `@${u.username}` : u.id}</b><span className="price">{fmt(u.balance)}</span></div>
          <div className="muted">ID {u.id}{u.banned ? " · bloklangan" : ""}</div>
        </div>
      ))}
      {sel && (
        <div className="modal" onClick={() => setSel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="gold">Balans: {sel.id}</h3>
            <input type="number" placeholder="Summa (+ qo'shish, - ayirish)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input placeholder="Sabab (majburiy)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn" disabled={!parseInt(amount, 10) || note.trim().length < 3}
              onClick={() => act(() => api("/api/admin/balance", "POST", { user_id: sel.id, amount: parseInt(amount, 10), note }),
                () => { setSel(null); setAmount(""); setNote(""); load(); })}>Bajarish</button>
          </div>
        </div>
      )}
    </>
  );
}

function Tickets() {
  const { data, load } = useLoad("/api/admin/tickets");
  const [reply, setReply] = useState<Record<string, string>>({});
  return (
    <>
      {(data || []).map((t: any) => (
        <div className="card" key={t.id}>
          <div className="row"><b>#{t.id}</b><span className="badge">{STATUS_UZ[t.status] || t.status}</span></div>
          <div className="muted">User {t.user_id} · to'lov: {t.payment_id || "-"} · buyurtma: {t.order_id || "-"}</div>
          {t.messages.map((m: any, i: number) => <div key={i} className={`msg ${m.admin ? "admin" : ""}`}>{m.admin ? "🛡 " : ""}{m.text}</div>)}
          <input placeholder="Javob" value={reply[t.id] || ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} />
          <button className="btn small" disabled={!(reply[t.id] || "").trim()}
            onClick={() => act(() => api(`/api/admin/tickets/${t.id}/reply`, "POST", { text: reply[t.id] }), () => { setReply({ ...reply, [t.id]: "" }); load(); })}>Javob berish</button>
        </div>
      ))}
    </>
  );
}

function Audit() {
  const { data } = useLoad("/api/admin/audit");
  return (
    <>
      {(data || []).map((a: any, i: number) => (
        <div className="card" key={i}>
          <div className="row"><b>{a.action}</b><span className="muted">{new Date(a.at).toLocaleString()}</span></div>
          <div className="muted">{a.details}</div>
        </div>
      ))}
    </>
  );
}
