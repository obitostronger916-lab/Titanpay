
import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ } from "../api";
import type { Me, Nav } from "../App";

const KIND_UZ: Record<string, string> = {
  topup: "Balans to'ldirildi",
  purchase: "Xarid",
  refund: "Pul qaytarildi",
  adjust: "Admin o'zgartirishi",
  mismatch_credit: "Tasdiqlangan to'lov",
};

export function Balance({ me }: { me: Me }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/ledger")
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="card balance-card">
        <div className="muted">SIZNING JORIY BALANSINGIZ</div>
        <div className="big gold">{fmt(me.balance)}</div>
        <div className="muted" style={{ marginTop: 6 }}>
          UZS · TITAN DONAT
        </div>
      </div>

      <div className="row" style={{ margin: "20px 0 12px" }}>
        <h3 style={{ margin: 0 }}>Balans tarixi</h3>
        <span className="muted">{rows.length} ta operatsiya</span>
      </div>

      {loading && <div className="muted">Tarix yuklanmoqda...</div>}

      {!loading && rows.length === 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>📊</div>
          <b>Hozircha operatsiyalar yo'q</b>
          <p className="muted">Balansingizdagi o'zgarishlar shu yerda chiqadi.</p>
        </div>
      )}

      {rows.map((r, i) => (
        <div className="card" key={r.id ?? i}>
          <div className="row">
            <div>
              <b>{KIND_UZ[r.kind] || r.kind}</b>
              <div className="muted" style={{ marginTop: 5 }}>
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>

            <b
              style={{
                color: r.amount > 0 ? "var(--green)" : "var(--red)",
                whiteSpace: "nowrap",
              }}
            >
              {r.amount > 0 ? "+" : ""}
              {fmt(r.amount)}
            </b>
          </div>

          <div className="muted" style={{ marginTop: 12 }}>
            Qoldiq: {fmt(r.balance_after)}
          </div>
        </div>
      ))}
    </>
  );
}

export function Orders({ go }: { go: Nav }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/orders")
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ marginBottom: 17 }}>
        <div className="muted">TITAN DONAT</div>
        <h2 style={{ margin: "5px 0" }}>Buyurtmalarim 📦</h2>
        <div className="muted">Barcha buyurtmalaringiz tarixi.</div>
      </div>

      {loading && <div className="muted">Buyurtmalar yuklanmoqda...</div>}

      {!loading && rows.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 25 }}>
          <div style={{ fontSize: 36 }}>📦</div>
          <b>Buyurtmalar hali yo'q</b>
          <p className="muted">Donat do'konidan mahsulot tanlashingiz mumkin.</p>
        </div>
      )}

      {rows.map((o) => (
        <div className="card" key={o.id}>
          <div className="row">
            <b>Buyurtma #{o.id}</b>
            <span className="badge">
              {STATUS_UZ[o.status] || o.status}
            </span>
          </div>

          <h3 style={{ margin: "13px 0 5px" }}>{o.product}</h3>

          <div className="price">{fmt(o.price)}</div>

          <div className="muted" style={{ marginTop: 9 }}>
            {new Date(o.created_at).toLocaleString()}
          </div>

          {o.result && (
            <div className="msg" style={{ marginTop: 10 }}>
              Natija: {o.result}
            </div>
          )}

          <button
            className="btn ghost"
            style={{ marginTop: 12 }}
            onClick={() => go("support", { order_id: o.id })}
          >
            🎧 Buyurtma bo'yicha yordam
          </button>
        </div>
      ))}
    </>
  );
}

export function Profile({ me }: { me: Me }) {
  return (
    <>
      <div className="card balance-card" style={{ textAlign: "center", padding: 25 }}>
        <div
          style={{
            width: 75,
            height: 75,
            borderRadius: 25,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 13px",
            background: "linear-gradient(135deg,#294d75,#44366f)",
            fontSize: 36,
          }}
        >
          👤
        </div>

        <h2 style={{ marginBottom: 5 }}>{me.name || "O'yinchi"}</h2>
        <div className="muted">ONESTATE ROLEPLAY</div>
        <div className="big gold" style={{ marginTop: 15 }}>
          {fmt(me.balance)}
        </div>
        <div className="muted">Mavjud balans · UZS</div>
      </div>

      <div className="card">
        <h3>Profil ma'lumotlari</h3>

        <div className="row" style={{ padding: "12px 0" }}>
          <span className="muted">Ism</span>
          <b>{me.name || "-"}</b>
        </div>

        <div className="row" style={{ padding: "12px 0" }}>
          <span className="muted">Telegram ID</span>
          <b>{me.id}</b>
        </div>

        <div className="row" style={{ padding: "12px 0" }}>
          <span className="muted">Hisob holati</span>
          <span className="badge">Faol</span>
        </div>

        {me.is_admin && (
          <div className="row" style={{ padding: "12px 0" }}>
            <span className="muted">Huquq</span>
            <span className="badge">Administrator</span>
          </div>
        )}
      </div>
    </>
  );
}

export function Rules() {
  const rules = [
    "To'lov UzCard va Humo orqali amalga oshirilishi ko'zda tutilgan.",
    "To'lovda aynan ko'rsatilgan summani yuboring. Farq bo'lsa, support orqali tekshiruv talab qilinishi mumkin.",
    "Chek rasmi o'z-o'zidan to'lov tasdig'i hisoblanmaydi. Provayder yoki administrator tasdig'i zarur.",
    "To'lov bilan bog'liq muammo bo'lsa, imkon qadar tez supportga murojaat qiling.",
    "Donat o'yin nikingizga yuborilishi ko'zda tutilgan. Nikni xarid vaqtida diqqat bilan tekshiring.",
    "O'yin API orqali yetkazib berish ishlamasa, buyurtma tekshiruvga yuboriladi. Pul qaytarilishi shartlari support orqali aniqlanadi.",
    "Hisobingiz va Telegram profilingiz xavfsizligini saqlang.",
  ];

  return (
    <>
      <div style={{ marginBottom: 17 }}>
        <div className="muted">TITAN DONAT</div>
        <h2 style={{ margin: "5px 0" }}>Foydalanish qoidalari 📜</h2>
        <div className="muted">
          Xarid va to'lovdan oldin qoidalar bilan tanishing.
        </div>
      </div>

      {rules.map((rule, i) => (
        <div className="card" key={i}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <span
              className="badge"
              style={{ minWidth: 29, textAlign: "center" }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, lineHeight: 1.55 }}>{rule}</div>
          </div>
        </div>
      ))}
    </>
  );
}
