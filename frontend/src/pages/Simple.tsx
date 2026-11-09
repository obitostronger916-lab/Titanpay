import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ } from "../api";
import type { Me, Nav } from "../App";

const KIND_UZ: Record<string, string> = {
  topup: "Balans to'ldirildi", purchase: "Xarid", refund: "Qaytarildi",
  adjust: "Admin o'zgartirishi", mismatch_credit: "Tasdiqlangan to'lov",
};

export function Balance({ me }: { me: Me }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/api/ledger").then(setRows).catch(() => {}); }, []);
  return (
    <>
      <div className="card balance-card"><div className="muted">Joriy balans</div><div className="big gold">{fmt(me.balance)}</div></div>
      <h3>Tarix</h3>
      {rows.length === 0 && <div className="muted">Hozircha operatsiyalar yo'q.</div>}
      {rows.map((r, i) => (
        <div className="card" key={i}>
          <div className="row">
            <span>{KIND_UZ[r.kind] || r.kind}</span>
            <b style={{ color: r.amount > 0 ? "var(--green)" : "var(--red)" }}>{r.amount > 0 ? "+" : ""}{fmt(r.amount)}</b>
          </div>
          <div className="muted">{new Date(r.created_at).toLocaleString()} · qoldiq {fmt(r.balance_after)}</div>
        </div>
      ))}
    </>
  );
}

export function Orders({ go }: { go: Nav }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/api/orders").then(setRows).catch(() => {}); }, []);
  return (
    <>
      {rows.length === 0 && <div className="muted">Buyurtmalar yo'q.</div>}
      {rows.map((o) => (
        <div className="card" key={o.id}>
          <div className="row"><b>#{o.id}</b><span className="badge">{STATUS_UZ[o.status] || o.status}</span></div>
          <div>{o.product} — <span className="price">{fmt(o.price)}</span></div>
          <div className="muted">{new Date(o.created_at).toLocaleString()}</div>
          {o.result && <div className="muted">Natija: {o.result}</div>}
          <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => go("support", { order_id: o.id })}>Support</button>
        </div>
      ))}
    </>
  );
}

export function Profile({ me }: { me: Me }) {
  return (
    <div className="card">
      <div className="row"><span className="muted">Ism</span><b>{me.name || "-"}</b></div>
      <div className="row"><span className="muted">Telegram ID</span><b>{me.id}</b></div>
      <div className="row"><span className="muted">Balans</span><b className="price">{fmt(me.balance)}</b></div>
    </div>
  );
}

export function Rules() {
  const rules = [
    "To'lov faqat UzCard va Humo orqali qabul qilinadi.",
    "Aynan ko'rsatilgan summani to'lang. Farq bo'lsa to'lov support orqali qo'lda tekshiriladi.",
    "Chek rasmi to'lov tasdig'i hisoblanmaydi: faqat to'lov provayderi tasdig'i hisobga olinadi.",
    "To'lov muammosi bo'yicha to'lov yaratilganidan keyin 20 daqiqa ichida supportga murojaat qiling.",
    "Donat o'yin nikingizga yuboriladi. Nikni to'g'ri kiriting, xato nik uchun javobgarlik foydalanuvchida.",
    "Yetkazib berish iloji bo'lmasa, pul balansingizga qaytariladi.",
    "Hisobingizni boshqalarga bermang.",
  ];
  return (
    <>
      {rules.map((r, i) => (
        <div className="card" key={i}><b className="gold">{i + 1}.</b> {r}</div>
      ))}
    </>
  );
}
