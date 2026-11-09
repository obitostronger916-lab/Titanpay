import { useEffect, useState } from "react";
import { api, STATUS_UZ } from "../api";

export default function Support({ ctx }: { ctx: { payment_id?: string; order_id?: string } | null }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});

  const load = () => api("/api/tickets").then(setTickets).catch(() => {});
  useEffect(() => { load(); }, []);

  async function create() {
    setErr("");
    try {
      await api("/api/tickets", "POST", { text, payment_id: ctx?.payment_id, order_id: ctx?.order_id });
      setText(""); load();
    } catch (e: any) { setErr(e.message); }
  }

  async function send(id: string) {
    try {
      await api(`/api/tickets/${id}/messages`, "POST", { text: reply[id] });
      setReply({ ...reply, [id]: "" }); load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <div className="card">
        {(ctx?.payment_id || ctx?.order_id) && <div className="muted" style={{ marginBottom: 8 }}>Bog'lanadi: {ctx?.payment_id ? `to'lov #${ctx.payment_id}` : `buyurtma #${ctx?.order_id}`}</div>}
        <textarea rows={4} placeholder="Muammoni yozing…" value={text} onChange={(e) => setText(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={text.trim().length < 3} onClick={create}>Yuborish</button>
      </div>
      <h3>Murojaatlarim</h3>
      {tickets.length === 0 && <div className="muted">Murojaatlar yo'q.</div>}
      {tickets.map((t) => (
        <div className="card" key={t.id}>
          <div className="row"><b>#{t.id}</b><span className="badge">{STATUS_UZ[t.status] || t.status}</span></div>
          {t.messages.map((m: any, i: number) => (
            <div key={i} className={`msg ${m.admin ? "admin" : ""}`}>{m.admin ? "🛡 Admin: " : ""}{m.text}</div>
          ))}
          <input placeholder="Javob yozish" value={reply[t.id] || ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} />
          <button className="btn ghost small" disabled={!(reply[t.id] || "").trim()} onClick={() => send(t.id)}>Yuborish</button>
        </div>
      ))}
    </>
  );
}
