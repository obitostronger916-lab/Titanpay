
import { useEffect, useState } from "react";
import { api, STATUS_UZ } from "../api";

type Ticket = {
  id: string;
  status: string;
  messages: {
    admin?: boolean;
    text: string;
  }[];
};

export default function Support({
  ctx,
}: {
  ctx: { payment_id?: string; order_id?: string } | null;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<Ticket[]>("/api/tickets")
      .then(setTickets)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (text.trim().length < 3) return;

    setBusy(true);
    setErr("");

    try {
      await api("/api/tickets", "POST", {
        text: text.trim(),
        payment_id: ctx?.payment_id,
        order_id: ctx?.order_id,
      });

      setText("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Murojaat yuborilmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function send(id: string) {
    const message = (reply[id] || "").trim();
    if (message.length < 1) return;

    setErr("");

    try {
      await api(`/api/tickets/${id}/messages`, "POST", {
        text: message,
      });

      setReply((old) => ({ ...old, [id]: "" }));
      await load();
    } catch (e: any) {
      setErr(e?.message || "Xabar yuborilmadi.");
    }
  }

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div className="muted">TITAN DONAT • ONESTATE RP</div>
        <h2 style={{ margin: "5px 0" }}>Yordam markazi</h2>
        <div className="muted">
          Savol yoki muammo bo'lsa, admin bilan bog'laning.
        </div>
      </div>

      <div
        className="card"
        style={{
          background:
            "linear-gradient(130deg,rgba(54,185,255,.13),rgba(145,108,255,.12))",
        }}
      >
        <div className="row">
          <div>
            <div className="muted">TITAN SUPPORT</div>
            <h3 style={{ margin: "5px 0" }}>Biz sizga yordam beramiz</h3>
          </div>
          <span style={{ fontSize: 34 }}>🛡️</span>
        </div>

        <p className="muted" style={{ marginBottom: 0 }}>
          Murojaatingizni yozing. Javob kelganda shu sahifada ko'rishingiz mumkin.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Yangi murojaat</h3>

        {ctx?.payment_id && (
          <div className="badge" style={{ marginBottom: 12 }}>
            To'lov #{ctx.payment_id}
          </div>
        )}

        {ctx?.order_id && (
          <div className="badge" style={{ marginBottom: 12 }}>
            Buyurtma #{ctx.order_id}
          </div>
        )}

        <textarea
          rows={4}
          placeholder="Muammo yoki savolingizni yozing..."
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />

        <div className="row muted" style={{ margin: "8px 0 12px" }}>
          <span>Kamida 3 ta belgi</span>
          <span>{text.length}/2000</span>
        </div>

        {err && <div className="err">{err}</div>}

        <button
          className="btn"
          disabled={busy || text.trim().length < 3}
          onClick={create}
        >
          {busy ? "Yuborilmoqda..." : "✉️ Murojaat yuborish"}
        </button>
      </div>

      <div className="row" style={{ margin: "22px 0 12px" }}>
        <h3 style={{ margin: 0 }}>Murojaatlarim</h3>
        <span className="badge">{tickets.length} ta</span>
      </div>

      {tickets.length === 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>💬</div>
          <b>Murojaatlar mavjud emas</b>
          <p className="muted" style={{ marginBottom: 0 }}>
            Yangi murojaat yuborsangiz, shu yerda ko'rinadi.
          </p>
        </div>
      )}

      {tickets.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <b>MUROJAAT #{t.id}</b>
            <span className="badge">
              {STATUS_UZ[t.status] || t.status}
            </span>
          </div>

          <div
            style={{
              height: 1,
              background: "var(--line)",
              margin: "14px 0",
            }}
          />

          <div style={{ display: "grid", gap: 10 }}>
            {(t.messages || []).map((m, i) => (
              <div
                key={i}
                className={`msg ${m.admin ? "admin" : ""}`}
              >
                <div
                  className="muted"
                  style={{ fontSize: 11, marginBottom: 5 }}
                >
                  {m.admin ? "🛡️ ADMIN" : "SIZ"}
                </div>
                {m.text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <input
              placeholder="Javob yozing..."
              value={reply[t.id] || ""}
              onChange={(e) =>
                setReply((old) => ({
                  ...old,
                  [t.id]: e.target.value,
                }))
              }
            />

            <button
              className="btn ghost small"
              style={{ marginTop: 10 }}
              disabled={!(reply[t.id] || "").trim()}
              onClick={() => send(t.id)}
            >
              Javob yuborish
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
