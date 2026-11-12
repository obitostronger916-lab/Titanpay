
import { useEffect, useState } from "react";
import { api, fmt, STATUS_UZ } from "../api";

const TABS = [
  "Statistika",
  "To'lovlar",
  "Buyurtmalar",
  "Mahsulotlar",
  "Foydalanuvchilar",
  "Support",
  "Audit",
  "Bannerlar",
  "Dizayn",
];

export default function Admin() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div className="muted">ONESTATE ROLEPLAY</div>
        <h2 style={{ margin: "5px 0" }}>Admin panel</h2>
        <div className="muted">TITAN DONAT boshqaruv markazi</div>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`chip ${t === tab ? "on" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === TABS[0] && <Stats />}
      {tab === TABS[1] && <Payments />}
      {tab === TABS[2] && <Orders />}
      {tab === TABS[3] && <Products />}
      {tab === TABS[4] && <Users />}
      {tab === TABS[5] && <Tickets />}
      {tab === TABS[6] && <Audit />}
      {tab === TABS[7] && <Banners />}
      {tab === TABS[8] && <BackgroundSettings />}
    </>
  );
}

function useLoad(path: string) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setErr("");

    return api(path)
      .then(setData)
      .catch((e) => setErr(e?.message || "Ma'lumot yuklanmadi."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [path]);

  return { data, err, loading, load };
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="card">
      <div className="err">{message}</div>
      <p className="muted">Ma'lumotni qayta yuklab ko'ring.</p>
    </div>
  );
}

function LoadingView() {
  return <div className="card muted">Ma'lumotlar yuklanmoqda...</div>;
}

async function act(fn: () => Promise<any>, after: () => void) {
  try {
    await fn();
    after();
  } catch (e: any) {
    alert(e?.message || "Amal bajarilmadi.");
  }
}

function Stats() {
  const { data, err, loading, load } = useLoad("/api/admin/stats");

  if (loading) return <LoadingView />;
  if (err) return <ErrorView message={err} />;
  if (!data) return null;

  const rows: [string, any, string][] = [
    ["Foydalanuvchilar", data.users, "👥"],
    ["Jami to'ldirilgan", fmt(data.topups_total), "💳"],
    ["Navbatdagi buyurtmalar", data.orders_queued, "📦"],
    ["Yetkazilgan buyurtmalar", data.orders_delivered, "✅"],
    ["Tekshiruvdagi to'lovlar", data.payments_review, "🔎"],
    ["Ochiq murojaatlar", data.tickets_open, "💬"],
  ];

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Umumiy statistika</h3>
        <button className="chip" onClick={load}>Yangilash ↻</button>
      </div>

      {rows.map(([name, value, icon]) => (
        <div className="card row" key={name}>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span className="muted">{name}</span>
          </div>
          <b className="price">{value ?? 0}</b>
        </div>
      ))}
    </>
  );
}

function Payments() {
  const [filter, setFilter] = useState("mismatch");
  const { data, err, loading, load } = useLoad(
    `/api/admin/payments?status=${filter}`
  );

  return (
    <>
      <h3>To'lovlarni boshqarish</h3>

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        {[
          "mismatch",
          "review",
          "created",
          "credited",
          "mismatch_credited",
          "rejected",
        ].map((s) => (
          <option key={s} value={s}>
            {STATUS_UZ[s] || s}
          </option>
        ))}
      </select>

      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}

      {!loading &&
        !err &&
        (data || []).map((p: any) => (
          <div className="card" key={p.id}>
            <div className="row">
              <b>TO'LOV #{p.id}</b>
              <span className="badge">
                {STATUS_UZ[p.status] || p.status}
              </span>
            </div>

            <div className="muted" style={{ marginTop: 12 }}>
              Foydalanuvchi: {p.user_id}
            </div>

            <div className="row" style={{ marginTop: 8 }}>
              <span className="muted">Kutilgan summa</span>
              <b>{fmt(p.expected)}</b>
            </div>

            <div className="row" style={{ marginTop: 8 }}>
              <span className="muted">To'langan summa</span>
              <b className="price">
                {p.paid != null ? fmt(p.paid) : "-"}
              </b>
            </div>

            <div className="muted" style={{ marginTop: 8 }}>
              Tranzaksiya: {p.tx || "-"}
            </div>

            {["mismatch", "review"].includes(p.status) && (
              <div className="row" style={{ marginTop: 14 }}>
                <button
                  className="btn small"
                  onClick={() =>
                    confirm(
                      `To'langan ${fmt(p.paid)} balansga qo'shilsinmi?`
                    ) &&
                    act(
                      () =>
                        api(
                          `/api/admin/payments/${p.id}/credit`,
                          "POST"
                        ),
                      load
                    )
                  }
                >
                  Balansga qo'shish
                </button>

                <button
                  className="btn red small"
                  onClick={() =>
                    confirm("To'lov rad etilsinmi?") &&
                    act(
                      () =>
                        api(
                          `/api/admin/payments/${p.id}/reject`,
                          "POST"
                        ),
                      load
                    )
                  }
                >
                  Rad etish
                </button>
              </div>
            )}
          </div>
        ))}

      {!loading && !err && (data || []).length === 0 && (
        <div className="card muted">To'lovlar topilmadi.</div>
      )}
    </>
  );
}

function Orders() {
  const [filter, setFilter] = useState("queued");
  const { data, err, loading, load } = useLoad(
    `/api/admin/orders?status=${filter}`
  );

  return (
    <>
      <h3>Buyurtmalar</h3>

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        {["queued", "processing", "delivered", "error"].map((s) => (
          <option key={s} value={s}>
            {STATUS_UZ[s] || s}
          </option>
        ))}
      </select>

      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}

      {!loading &&
        !err &&
        (data || []).map((o: any) => (
          <div className="card" key={o.id}>
            <div className="row">
              <b>BUYURTMA #{o.id}</b>
              <span className="badge">
                {STATUS_UZ[o.status] || o.status}
              </span>
            </div>

            <h3 style={{ marginBottom: 5 }}>{o.product}</h3>
            <b className="price">{fmt(o.price)}</b>

            <div className="muted" style={{ marginTop: 10 }}>
              User: {o.user_id}
            </div>
            <div className="muted">Character name: {o.character_name || o.nick}</div>
            <div className="muted">Server: {o.server || "—"}</div>
            <div className="muted">Client ID: {o.client_id || "—"}</div>
            <div className="muted">Privacy ID: {o.privacy_id || "—"}</div>

            {o.result && (
              <div className="card" style={{ marginTop: 10 }}>
                {o.result}
              </div>
            )}

            {o.status !== "delivered" && o.status !== "error" && (
              <div className="row" style={{ marginTop: 14 }}>
                <button
                  className="btn ghost small"
                  onClick={() =>
                    act(
                      () =>
                        api(
                          `/api/admin/orders/${o.id}/requeue`,
                          "POST"
                        ),
                      load
                    )
                  }
                >
                  Qayta navbatga
                </button>

                <button
                  className="btn red small"
                  onClick={() =>
                    confirm("Pul foydalanuvchi balansiga qaytarilsinmi?") &&
                    act(
                      () =>
                        api(
                          `/api/admin/orders/${o.id}/refund`,
                          "POST"
                        ),
                      load
                    )
                  }
                >
                  Pulni qaytarish
                </button>
              </div>
            )}
          </div>
        ))}

      {!loading && !err && (data || []).length === 0 && (
        <div className="card muted">Buyurtmalar topilmadi.</div>
      )}
    </>
  );
}

const EMPTY = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  category: "ONESTATE donat",
  in_stock: true,
  delivery_payload: "",
};

function Products() {
  const { data, err, loading, load } = useLoad("/api/admin/products");
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);

  const set = (k: string, v: any) =>
    setForm((old: any) => ({ ...old, [k]: v }));

  function reset() {
    setForm({ ...EMPTY });
    setEditId(null);
  }

  function save() {
    const price = parseInt(form.price, 10);

    if (!form.name.trim() || !Number.isSafeInteger(price) || price <= 0) {
      return;
    }

    const body = {
      ...form,
      name: form.name.trim(),
      price,
      image_url: form.image_url || null,
      delivery_payload: form.delivery_payload || null,
    };

    act(
      () =>
        editId
          ? api(`/api/admin/products/${editId}`, "PUT", body)
          : api("/api/admin/products", "POST", body),
      () => {
        reset();
        load();
      }
    );
  }

  return (
    <>
      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>
            {editId ? `Mahsulot #${editId}` : "Yangi mahsulot"}
          </h3>
          <span className="badge">UZS</span>
        </div>

        <input
          placeholder="Mahsulot nomi"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />

        <textarea
          rows={3}
          placeholder="Mahsulot tavsifi"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <input
          type="number"
          min="1"
          placeholder="Narxi (UZS)"
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
        />

        <input
          placeholder="Rasm URL (https://...)"
          value={form.image_url || ""}
          onChange={(e) => set("image_url", e.target.value)}
        />

        <input
          placeholder="Paket turi (masalan: VIP, valyuta)"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        />

        <input
          placeholder="Yetkazish ma'lumoti (API)"
          value={form.delivery_payload || ""}
          onChange={(e) => set("delivery_payload", e.target.value)}
        />

        <label className="row" style={{ margin: "12px 0" }}>
          <span>Mahsulot mavjud</span>
          <input
            type="checkbox"
            style={{ width: 24, margin: 0 }}
            checked={form.in_stock}
            onChange={(e) => set("in_stock", e.target.checked)}
          />
        </label>

        <button
          className="btn"
          disabled={
            !form.name.trim() ||
            !Number.isSafeInteger(Number(form.price)) ||
            Number(form.price) <= 0
          }
          onClick={save}
        >
          {editId ? "O'zgarishlarni saqlash" : "Mahsulot qo'shish"}
        </button>

        {editId && (
          <button
            className="btn ghost"
            style={{ marginTop: 8 }}
            onClick={reset}
          >
            Bekor qilish
          </button>
        )}
      </div>

      <h3>Mahsulotlar ro'yxati</h3>

      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}

      {!loading &&
        !err &&
        (data || []).map((p: any) => (
          <button
            type="button"
            className="card"
            key={p.id}
            style={{
              width: "100%",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
            }}
            onClick={() => {
              setEditId(p.id);
              setForm({
                ...p,
                price: String(p.price),
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="row">
              <b>{p.name}</b>
              <span className="price">{fmt(p.price)}</span>
            </div>
            <div className="muted">
              {p.category} · {p.in_stock ? "Mavjud" : "Mavjud emas"}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Tahrirlash uchun bosing
            </div>
          </button>
        ))}
    </>
  );
}


const EMPTY_BANNER = {
  title: "",
  text: "",
  image_url: "",
  target_url: "",
  enabled: true,
};

function Banners() {
  const { data, err, loading, load } = useLoad("/api/admin/banners");
  const [form, setForm] = useState<any>({ ...EMPTY_BANNER });
  const [editId, setEditId] = useState<number | null>(null);

  const set = (key: string, value: any) =>
    setForm((old: any) => ({ ...old, [key]: value }));

  function reset() {
    setForm({ ...EMPTY_BANNER });
    setEditId(null);
  }

  function save() {
    const body = {
      ...form,
      title: form.title.trim(),
      text: form.text.trim(),
      image_url: form.image_url.trim() || null,
      target_url: form.target_url.trim() || null,
    };
    if (body.title.length < 2) return;
    act(
      () => editId
        ? api(`/api/admin/banners/${editId}`, "PUT", body)
        : api("/api/admin/banners", "POST", body),
      () => { reset(); load(); }
    );
  }

  function toggle(b: any) {
    act(
      () => api(`/api/admin/banners/${b.id}`, "PUT", {
        title: b.title, text: b.text || "", image_url: b.image_url || null,
        target_url: b.target_url || null, enabled: !b.enabled,
      }),
      load
    );
  }

  return (
    <>
      <div className="card banner-manager-card">
        <div className="banner-manager-intro">
          <span className="eyebrow">REKLAMA BOSHQARUVI</span>
          <p className="muted">Bir nechta banner qo‘shing. Faol bannerlar bosh sahifada navbat bilan avtomatik almashadi — eskisini o‘chirish shart emas.</p>
        </div>
        <div className="row">
          <h3 style={{ margin: 0 }}>{editId ? "Banner tahrirlash" : "Yangi banner"}</h3>
          <span className="badge">SLIDER</span>
        </div>
        <input placeholder="Banner sarlavhasi" maxLength={120}
          value={form.title} onChange={(e) => set("title", e.target.value)} />
        <textarea rows={3} placeholder="Banner matni"
          value={form.text} onChange={(e) => set("text", e.target.value)} />
        <input placeholder="Rasm URL (https://...)" type="url"
          value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} />
        <input placeholder="Bosilganda ochiladigan havola (https://...) " type="url"
          value={form.target_url || ""} onChange={(e) => set("target_url", e.target.value)} />
        <label className="row" style={{ margin: "10px 0" }}>
          <span>Banner faol</span>
          <input type="checkbox" style={{ width: 24, margin: 0 }}
            checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
        </label>
        <button className="btn" disabled={form.title.trim().length < 2} onClick={save}>
          {editId ? "O'zgarishlarni saqlash" : "Banner qo'shish"}
        </button>
        {editId && <button className="btn ghost" style={{ marginTop: 8 }} onClick={reset}>Bekor qilish</button>}
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <div><span className="eyebrow">KONTENT</span><h3 style={{ margin: "4px 0 0" }}>Bannerlar ro'yxati</h3></div>
        <button className="chip" onClick={load}>Yangilash ↻</button>
      </div>
      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}
      {!loading && !err && (data || []).map((b: any) => (
        <div className="card" key={b.id}>
          {b.image_url && <img className="banner-admin-image" src={b.image_url} alt={b.title} />}
          <div className="row">
            <b>{b.title}</b>
            <span className={`badge ${b.enabled ? "" : "muted"}`}>{b.enabled ? "Faol" : "O'chirilgan"}</span>
          </div>
          {b.text && <p className="muted">{b.text}</p>}
          {b.target_url && <div className="muted" style={{ overflowWrap: "anywhere" }}>{b.target_url}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn ghost small" onClick={() => { setEditId(b.id); setForm({ ...b, image_url: b.image_url || "", target_url: b.target_url || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Tahrirlash</button>
            <button className="btn ghost small" onClick={() => toggle(b)}>{b.enabled ? "O'chirish" : "Faollashtirish"}</button>
            <button className="btn red small" onClick={() => confirm("Banner butunlay o'chirilsinmi?") && act(() => api(`/api/admin/banners/${b.id}`, "DELETE"), load)}>O'chirish</button>
          </div>
        </div>
      ))}
      {!loading && !err && (data || []).length === 0 && <div className="card muted">Hozircha banner yo'q.</div>}
    </>
  );
}

function Users() {
  const { data, err, loading, load } = useLoad("/api/admin/users");
  const [sel, setSel] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function updateBalance() {
    const value = parseInt(amount, 10);

    if (!Number.isSafeInteger(value) || value === 0 || note.trim().length < 3) {
      return;
    }

    act(
      () =>
        api("/api/admin/balance", "POST", {
          user_id: sel.id,
          amount: value,
          note: note.trim(),
        }),
      () => {
        setSel(null);
        setAmount("");
        setNote("");
        load();
      }
    );
  }

  return (
    <>
      <h3>Foydalanuvchilar</h3>

      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}

      {!loading &&
        !err &&
        (data || []).map((u: any) => (
          <button
            type="button"
            className="card"
            key={u.id}
            style={{
              width: "100%",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
            }}
            onClick={() => setSel(u)}
          >
            <div className="row">
              <b>{u.username ? `@${u.username}` : u.id}</b>
              <span className="price">{fmt(u.balance)}</span>
            </div>
            <div className="muted">
              ID: {u.id}
              {u.banned ? " · Bloklangan" : ""}
            </div>
            <div className="muted" style={{ marginTop: 5 }}>
              Balansni boshqarish uchun bosing
            </div>
          </button>
        ))}

      {sel && (
        <div className="modal" onClick={() => setSel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <h3 style={{ margin: 0 }}>Balans boshqaruvi</h3>
              <button className="chip" onClick={() => setSel(null)}>
                ✕
              </button>
            </div>

            <div className="muted" style={{ marginTop: 12 }}>
              Foydalanuvchi ID: {sel.id}
            </div>

            <h2 className="price">{fmt(sel.balance)}</h2>

            <input
              type="number"
              placeholder="Summa (+ qo'shish, - ayirish)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <input
              placeholder="Sabab (majburiy)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              className="btn"
              disabled={
                !Number.isSafeInteger(Number(amount)) ||
                Number(amount) === 0 ||
                note.trim().length < 3
              }
              onClick={updateBalance}
            >
              Balansni o'zgartirish
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Tickets() {
  const { data, err, loading, load } = useLoad("/api/admin/tickets");
  const [reply, setReply] = useState<Record<string, string>>({});

  return (
    <>
      <h3>Support murojaatlari</h3>

      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}

      {!loading &&
        !err &&
        (data || []).map((t: any) => (
          <div className="card" key={t.id}>
            <div className="row">
              <b>MUROJAAT #{t.id}</b>
              <span className="badge">
                {STATUS_UZ[t.status] || t.status}
              </span>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              User: {t.user_id}
            </div>
            <div className="muted">
              To'lov: {t.payment_id || "-"} · Buyurtma: {t.order_id || "-"}
            </div>

            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {(t.messages || []).map((m: any, i: number) => (
                <div
                  key={i}
                  className={`msg ${m.admin ? "admin" : ""}`}
                >
                  <div className="muted" style={{ fontSize: 11 }}>
                    {m.admin ? "🛡️ ADMIN" : "FOYDALANUVCHI"}
                  </div>
                  {m.text}
                </div>
              ))}
            </div>

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
              className="btn small"
              style={{ marginTop: 8 }}
              disabled={!(reply[t.id] || "").trim()}
              onClick={() =>
                act(
                  () =>
                    api(`/api/admin/tickets/${t.id}/reply`, "POST", {
                      text: reply[t.id].trim(),
                    }),
                  () => {
                    setReply((old) => ({ ...old, [t.id]: "" }));
                    load();
                  }
                )
              }
            >
              Javob yuborish
            </button>
          </div>
        ))}

      {!loading && !err && (data || []).length === 0 && (
        <div className="card muted">Murojaatlar mavjud emas.</div>
      )}
    </>
  );
}

function Audit() {
  const { data, err, loading, load } = useLoad("/api/admin/audit");

  return (
    <>
      <div className="row">
        <h3>Amallar tarixi</h3>
        <button className="chip" onClick={load}>Yangilash ↻</button>
      </div>

      {loading && <LoadingView />}
      {err && <ErrorView message={err} />}

      {!loading &&
        !err &&
        (data || []).map((a: any, i: number) => (
          <div className="card" key={i}>
            <b>{a.action}</b>
            <div className="muted" style={{ marginTop: 7 }}>
              {a.at ? new Date(a.at).toLocaleString() : ""}
            </div>
            <div style={{ marginTop: 8 }}>{a.details}</div>
          </div>
        ))}

      {!loading && !err && (data || []).length === 0 && (
        <div className="card muted">Audit yozuvlari mavjud emas.</div>
      )}
    </>
  );
}


function BackgroundSettings() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ background_image: string | null }>("/api/app-settings")
      .then((result) => setCurrentImage(result.background_image || null))
      .catch((e: any) => setError(e?.message || "Fon rasmi yuklanmadi"))
      .finally(() => setLoading(false));
  }, []);

  function chooseImage(file?: File) {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Faqat JPG, PNG yoki WebP formatidagi rasmni tanlang.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Rasm hajmi 2 MB dan oshmasligi kerak.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(String(reader.result));
    reader.onerror = () => setError("Rasmni o'qib bo'lmadi.");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!imageData) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/settings/background", "PUT", { image_data: imageData });
      setCurrentImage(imageData);
      setImageData(null);
      document.documentElement.style.setProperty("--shared-background-image", `url("${imageData}")`);
      alert("Umumiy fon rasmi saqlandi. Barcha foydalanuvchilarga ko'rsatiladi.");
    } catch (e: any) {
      setError(e?.message || "Fon rasmini saqlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Umumiy fon rasmi olib tashlansinmi?")) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/settings/background", "DELETE");
      setCurrentImage(null);
      setImageData(null);
      document.documentElement.style.removeProperty("--shared-background-image");
    } catch (e: any) {
      setError(e?.message || "Fon rasmini olib tashlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  }

  const preview = imageData || currentImage;
  return (
    <div className="card background-settings-card">
      <h3>Umumiy fon rasmi</h3>
      <p className="muted">Bu yerga qo'yilgan rasm TITANPAY ilovasini ochgan barcha foydalanuvchilarga ko'rinadi.</p>
      {loading ? <div className="muted">Yuklanmoqda...</div> : null}
      {preview && <img className="shared-background-preview" src={preview} alt="Umumiy fon rasmi ko'rinishi" />}
      <label className="background-file-label">
        <span>Rasm tanlash (JPG, PNG, WebP · 2 MB gacha)</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => chooseImage(e.target.files?.[0])} />
      </label>
      {imageData && <div className="muted">Yangi rasm tanlandi. Saqlash tugmasini bosing.</div>}
      {error && <div className="err">{error}</div>}
      <button className="btn" disabled={!imageData || busy} onClick={save}>{busy ? "Saqlanmoqda..." : "Barcha foydalanuvchilar uchun saqlash"}</button>
      {currentImage && <button className="btn ghost" style={{ marginTop: 8 }} disabled={busy} onClick={remove}>Fon rasmini olib tashlash</button>}
    </div>
  );
}
