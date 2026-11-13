import { useEffect, useState } from "react";
import { api, STATUS_UZ } from "../api";
import { Icon } from "../icons";

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
      <div className="mb-l">
        <div className="eyebrow">TITAN DONAT • ONESTATE RP</div>
        <h2 className="mt-s mb-s">Yordam markazi</h2>
        <div className="muted">
          Savol yoki muammo bo'lsa, admin bilan bog'laning.
        </div>
      </div>

      <div className="card soft">
        <div className="row">
          <div>
            <div className="eyebrow">TITAN SUPPORT</div>
            <h3 className="mt-s mb-s">Biz sizga yordam beramiz</h3>
          </div>
          <Icon name="support" size={32} />
        </div>

        <p className="muted m0">
          Murojaatingizni yozing. Javob kelganda shu sahifada ko'rishingiz mumkin.
        </p>
      </div>

      <div className="card">
        <h3>Yangi murojaat</h3>

        {ctx?.payment_id && (
          <div className="badge mb-m">
            To'lov #{ctx.payment_id}
          </div>
        )}

        {ctx?.order_id && (
          <div className="badge mb-m">
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

        <div className="row muted mb-m">
          <span>Kamida 3 ta belgi</span>
          <span>{text.length}/2000</span>
        </div>

        {err && <div className="err">{err}</div>}

        <button
          className="btn"
          disabled={busy || text.trim().length < 3}
          onClick={create}
        >
          <Icon name="message" size={18} /> {busy ? "Yuborilmoqda..." : "Murojaat yuborish"}
        </button>
      </div>

      <div className="row mt-l mb-m">
        <h3 className="m0">Murojaatlarim</h3>
        <span className="badge">{tickets.length} ta</span>
      </div>

      {tickets.length === 0 && (
        <div className="card state">
          <div className="state-icon"><Icon name="message" size={22} /></div>
          <b>Murojaatlar mavjud emas</b>
          <p>Yangi murojaat yuborsangiz, shu yerda ko'rinadi.</p>
        </div>
      )}

      {tickets.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <b>MUROJAAT #{t.id}</b>
            <span className="badge" data-status={t.status}>
              {STATUS_UZ[t.status] || t.status}
            </span>
          </div>

          <div className="divider" />

          <div className="msgs" style={{ marginTop: 0 }}>
            {(t.messages || []).map((m, i) => (
              <div
                key={i}
                className={`msg ${m.admin ? "admin" : ""}`}
              >
                <div className="muted" style={{ fontSize: 11, marginBottom: 5 }}>
                  {m.admin ? "ADMIN" : "SIZ"}
                </div>
                {m.text}
              </div>
            ))}
          </div>

          <div className="mt-l">
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
