import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ, tg } from "../api";
import { Icon } from "../icons";
import type { Nav } from "../App";

type Pay = {
  id: string;
  expected: number;
  paid: number | null;
  status: string;
  created_at: string;
  can_report: boolean;
};

export default function Topup({ go }: { go: Nav }) {
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [list, setList] = useState<Pay[]>([]);
  const [busy, setBusy] = useState(false);
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  const [paymentStatusLoaded, setPaymentStatusLoaded] = useState(false);

  const load = () =>
    api<Pay[]>("/api/payments")
      .then(setList)
      .catch(() => {});

  useEffect(() => {
    load();
    api<{ available: boolean }>("/api/payment-status")
      .then((status) => setPaymentAvailable(status.available))
      .catch(() => setPaymentAvailable(false))
      .finally(() => setPaymentStatusLoaded(true));
  }, []);

  async function create() {
    const value = Number(amount);

    if (!paymentAvailable) {
      setErr("UzCard/Humo to'lov provayderi hali ulanmagan.");
      return;
    }

    if (!Number.isSafeInteger(value) || value < 1000) {
      setErr("Kamida 1 000 UZS kiriting.");
      return;
    }

    setBusy(true);
    setErr("");
    setInfo(null);

    try {
      // Backend hozircha faqat summani qabul qiladi.
      // Karta turi tanlovi interfeysda ko'rsatiladi.
      const r = await api("/api/payments", "POST", {
        amount: value,
      });

      setInfo(r);
      setAmount("");
      load();
    } catch (e: any) {
      setErr(e?.message || "To'lov yaratilmadi.");
    } finally {
      setBusy(false);
    }
  }

  function openPayment(url: string) {
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <div className="mb-l">
        <div className="eyebrow">ONESTATE ROLEPLAY</div>
        <h2 className="mt-s mb-s">Balansni to'ldirish</h2>
        <div className="muted">
          UzCard va Humo orqali to'lov xizmati holati quyida ko'rsatiladi.
        </div>
      </div>

      <div className="card">
        <h3>To'lov tizimlari</h3>
        {!paymentStatusLoaded ? (
          <p className="muted m0">To'lov tizimi holati tekshirilmoqda...</p>
        ) : paymentAvailable ? (
          <p className="muted m0">To'lov provayderi ulangan. To'lovni davom ettirishingiz mumkin.</p>
        ) : (
          <p className="muted m0">
            UzCard/Humo provayderi hali ulanmagan. Xizmat tayyor bo'lmaguncha to'lov yaratish yopiq.
          </p>
        )}
      </div>

      <div className="card">
        <h3>To'lov summasi</h3>
        <div className="muted mb-m">
          Summani UZS da kiriting. Minimal summa — 1 000 UZS.
        </div>

        <input
          type="number"
          inputMode="numeric"
          min="1000"
          step="1000"
          placeholder="Masalan: 50000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy || !paymentAvailable}
        />

        <div className="chips">
          {[10000, 25000, 50000, 100000].map((v) => (
            <button
              key={v}
              className="chip"
              onClick={() => setAmount(String(v))}
            >
              {fmt(v)}
            </button>
          ))}
        </div>

        {err && <div className="err">{err}</div>}

        <button
          className="btn"
          disabled={
            busy ||
            !paymentAvailable ||
            !Number.isSafeInteger(Number(amount)) ||
            Number(amount) < 1000
          }
          onClick={create}
        >
          {busy ? "Yaratilmoqda..." : paymentAvailable ? "To'lov yaratish" : "Provayder ulanmagan"}
        </button>
      </div>

      {info && (
        <div className="card strong">
          <div className="badge on">TO'LOV YARATILDI</div>
          <h3 className="mt-m">To'lov ma'lumotlari</h3>

          <div className="row mt-m">
            <span className="muted">To'lov ID</span>
            <b>{info.payment_id}</b>
          </div>

          <div className="row mt-m">
            <span className="muted">To'lanadigan summa</span>
            <b className="price">{fmt(info.amount)}</b>
          </div>

          {info.card_info && (
            <div className="msg mt-m">
              {info.card_info}
            </div>
          )}

          {info.expires_at && (
            <div className="muted mt-m">
              Amal qilish muddati:{" "}
              {new Date(info.expires_at).toLocaleString()}
            </div>
          )}

          {info.pay_url && (
            <button
              className="btn mt-l"
              onClick={() => openPayment(info.pay_url)}
            >
              To'lovga o'tish
            </button>
          )}

          <p className="muted mt-m m0">
            To'lov holati tasdiqlanmaguncha balansga mablag' qo'shilmaydi.
          </p>
        </div>
      )}

      <div className="row mt-l mb-m">
        <h3 className="m0">To'lovlar tarixi</h3>
        <span className="muted">{list.length} ta</span>
      </div>

      {list.length === 0 && (
        <div className="card state">
          <div className="state-icon"><Icon name="card" size={22} /></div>
          <b>Hozircha to'lovlar mavjud emas</b>
        </div>
      )}

      {list.map((p) => (
        <div className="card" key={p.id}>
          <div className="row">
            <b>#{p.id}</b>
            <span className="badge" data-status={p.status}>
              {STATUS_UZ[p.status] || p.status}
            </span>
          </div>

          <div className="row mt-m">
            <span className="muted">Kutilgan summa</span>
            <b className="price">{fmt(p.expected)}</b>
          </div>

          {p.paid != null && (
            <div className="row mt-s">
              <span className="muted">To'langan</span>
              <b>{fmt(p.paid)}</b>
            </div>
          )}

          <div className="muted mt-s">
            {new Date(p.created_at).toLocaleString()}
          </div>

          {p.can_report && p.status !== "credited" && (
            <button
              className="btn ghost mt-m"
              onClick={() =>
                go("support", { payment_id: p.id })
              }
            >
              Muammo haqida yozish
            </button>
          )}
        </div>
      ))}
    </>
  );
}
