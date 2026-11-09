import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ, tg } from "../api";
import type { Nav } from "../App";

type Pay = { id: string; expected: number; paid: number | null; status: string; created_at: string; can_report: boolean };

export default function Topup({ go }: { go: Nav }) {
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [list, setList] = useState<Pay[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => api<Pay[]>("/api/payments").then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setErr(""); setInfo(null);
    try {
      const r = await api("/api/payments", "POST", { amount: parseInt(amount, 10) });
      setInfo(r);
      load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      <div className="card">
        <div className="muted" style={{ marginBottom: 8 }}>UzCard yoki Humo. Aynan ko'rsatilgan summani to'lang: 1 UZS farq bo'lsa ham to'lov avtomatik yozilmaydi.</div>
        <input type="number" inputMode="numeric" placeholder="Summa (UZS), min 1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy || !(parseInt(amount, 10) >= 1000)} onClick={create}>To'lov yaratish</button>
      </div>

      {info && (
        <div className="card balance-card">
          <div>To'lov ID: <b>{info.payment_id}</b></div>
          <div>To'lanadigan summa: <b className="price">{fmt(info.amount)}</b></div>
          {info.card_info && <div style={{ margin: "8px 0" }}>{info.card_info}</div>}
          <div className="muted">Muddati: {new Date(info.expires_at).toLocaleTimeString()} gacha</div>
          {info.pay_url && <button className="btn" style={{ marginTop: 10 }} onClick={() => (tg?.openLink ? tg.openLink(info.pay_url) : window.open(info.pay_url))}>To'lovga o'tish</button>}
        </div>
      )}

      <h3 style={{ marginTop: 16 }}>To'lovlar tarixi</h3>
      {list.length === 0 && <div className="muted">Hozircha yo'q.</div>}
      {list.map((p) => (
        <div className="card" key={p.id}>
          <div className="row"><b>#{p.id}</b><span className="badge">{STATUS_UZ[p.status] || p.status}</span></div>
          <div className="muted">Kutilgan: {fmt(p.expected)}{p.paid != null && ` · To'langan: ${fmt(p.paid)}`}</div>
          {p.can_report && p.status !== "credited" && (
            <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => go("support", { payment_id: p.id })}>Muammo haqida yozish</button>
          )}
        </div>
      ))}
    </>
  );
}
