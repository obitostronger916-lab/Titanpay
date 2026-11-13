import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ } from "../api";
import { Icon } from "../icons";
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
      <div className="balance-card">
        <div className="eyebrow">SIZNING JORIY BALANSINGIZ</div>
        <div className="big">{fmt(me.balance)}</div>
        <div className="muted mt-s">UZS · TITAN DONAT</div>
      </div>

      <div className="row mt-l mb-m">
        <h3 className="m0">Balans tarixi</h3>
        <span className="muted">{rows.length} ta operatsiya</span>
      </div>

      {loading && <div className="muted">Tarix yuklanmoqda...</div>}

      {!loading && rows.length === 0 && (
        <div className="card state">
          <div className="state-icon"><Icon name="wallet" size={22} /></div>
          <b>Hozircha operatsiyalar yo'q</b>
          <p>Balansingizdagi o'zgarishlar shu yerda chiqadi.</p>
        </div>
      )}

      {rows.map((r, i) => (
        <div className="card" key={r.id ?? i}>
          <div className="row">
            <div>
              <b>{KIND_UZ[r.kind] || r.kind}</b>
              <div className="muted mt-s">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>

            <b
              style={{
                color: r.amount > 0 ? "var(--ok)" : "var(--danger)",
                whiteSpace: "nowrap",
              }}
            >
              {r.amount > 0 ? "+" : ""}
              {fmt(r.amount)}
            </b>
          </div>

          <div className="muted mt-m">
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
      <div className="mb-l">
        <div className="eyebrow">TITAN DONAT</div>
        <h2 className="mt-s mb-s">Buyurtmalarim</h2>
        <div className="muted">Barcha buyurtmalaringiz tarixi.</div>
      </div>

      {loading && <div className="muted">Buyurtmalar yuklanmoqda...</div>}

      {!loading && rows.length === 0 && (
        <div className="card state">
          <div className="state-icon"><Icon name="box" size={22} /></div>
          <b>Buyurtmalar hali yo'q</b>
          <p>Donat do'konidan mahsulot tanlashingiz mumkin.</p>
        </div>
      )}

      {rows.map((o) => (
        <div className="card" key={o.id}>
          <div className="row">
            <b>Buyurtma #{o.id}</b>
            <span className="badge" data-status={o.status}>
              {STATUS_UZ[o.status] || o.status}
            </span>
          </div>

          <h3 className="mt-m mb-s">{o.product}</h3>
          <div className="muted">Character: {o.character_name || "—"} · Server: {o.server || "—"}</div>

          <div className="price mt-s">{fmt(o.price)}</div>

          <div className="muted mt-s">
            {new Date(o.created_at).toLocaleString()}
          </div>

          {o.result && (
            <div className="msg mt-m">
              Natija: {o.result}
            </div>
          )}

          <button
            className="btn ghost mt-m"
            onClick={() => go("support", { order_id: o.id })}
          >
            <Icon name="support" size={18} /> Buyurtma bo'yicha yordam
          </button>
        </div>
      ))}
    </>
  );
}

export function Profile({ me, go }: { me: Me; go: Nav }) {
  return (
    <>
      <div className="balance-card" style={{ textAlign: "center", padding: 24 }}>
        <div className="avatar"><Icon name="user" size={34} /></div>

        <h2 className="mb-s">{me.name || "O'yinchi"}</h2>
        <div className="muted">ONESTATE ROLEPLAY</div>
        <div className="big mt-l">{fmt(me.balance)}</div>
        <div className="muted">Mavjud balans · UZS</div>
      </div>

      <div className="card">
        <h3>Profil ma'lumotlari</h3>

        <div className="info-row">
          <span className="muted">Ism</span>
          <b>{me.name || "-"}</b>
        </div>

        <div className="info-row">
          <span className="muted">Telegram ID</span>
          <b>{me.id}</b>
        </div>

        <div className="info-row">
          <span className="muted">Hisob holati</span>
          <span className="badge on">Faol</span>
        </div>

        {me.is_admin && (
          <div className="info-row">
            <span className="muted">Huquq</span>
            <span className="badge on">Administrator</span>
          </div>
        )}
      </div>

      <button className="list-btn" onClick={() => go("balance")}>
        <span className="list-icon"><Icon name="wallet" /></span>
        <span className="list-text"><strong>Balans tarixi</strong><span>Barcha operatsiyalar</span></span>
        <Icon name="chevron" className="list-chev" />
      </button>
      <button className="list-btn" onClick={() => go("support")}>
        <span className="list-icon"><Icon name="support" /></span>
        <span className="list-text"><strong>Yordam</strong><span>Support bilan aloqa</span></span>
        <Icon name="chevron" className="list-chev" />
      </button>
      <button className="list-btn" onClick={() => go("rules")}>
        <span className="list-icon"><Icon name="rules" /></span>
        <span className="list-text"><strong>Qoidalar</strong><span>Foydalanish qoidalari</span></span>
        <Icon name="chevron" className="list-chev" />
      </button>
      {me.is_admin && (
        <button className="list-btn" onClick={() => go("admin")}>
          <span className="list-icon"><Icon name="admin" /></span>
          <span className="list-text"><strong>Admin panel</strong><span>Boshqaruv markazi</span></span>
          <Icon name="chevron" className="list-chev" />
        </button>
      )}
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
      <div className="mb-l">
        <div className="eyebrow">TITAN DONAT</div>
        <h2 className="mt-s mb-s">Foydalanish qoidalari</h2>
        <div className="muted">
          Xarid va to'lovdan oldin qoidalar bilan tanishing.
        </div>
      </div>

      {rules.map((rule, i) => (
        <div className="card" key={i}>
          <div className="row start">
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
