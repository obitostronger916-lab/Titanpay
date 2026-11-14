import { useEffect, useState } from "react";
import { api, fmt } from "../api";

type Period = "day" | "month" | "year";
type RatingItem = { rank: number; name: string; amount: number; avatar_url: string | null };
type RatingResponse = { period: Period; start: string; end: string; items: RatingItem[] };

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Kun" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
];

function Person({ item, large = false }: { item: RatingItem; large?: boolean }) {
  const initials = item.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return <div className={"rating-avatar " + (large ? "large" : "")}>
    {item.avatar_url ? <img src={item.avatar_url} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}
    <span>{initials}</span>
  </div>;
}

export default function Rating() {
  const [period, setPeriod] = useState<Period>("day");
  const [data, setData] = useState<RatingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<RatingResponse>("/api/rating?period=" + period)
      .then((result) => { if (active) setData(result); })
      .catch((e: any) => { if (active) setError(e?.message || "Reytingni yuklab bo‘lmadi"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  const items = data?.items || [];
  const first = items.find((item) => item.rank === 1);
  const second = items.find((item) => item.rank === 2);
  const third = items.find((item) => item.rank === 3);
  const rest = items.filter((item) => item.rank > 3);

  return <section className="rating-page">
    <div className="rating-intro">
      <span className="eyebrow">ONESTATE RP</span>
      <h2>Top donatchilar</h2>
      <p>Eng ko‘p tasdiqlangan donat qilgan o‘yinchilar</p>
    </div>
    <div className="tabs rating-tabs" role="tablist" aria-label="Reyting davri">
      {PERIODS.map((item) => <button key={item.value} type="button" role="tab"
        aria-selected={period === item.value} className={"chip " + (period === item.value ? "on" : "")}
        onClick={() => setPeriod(item.value)}>{item.label}</button>)}
    </div>

    {loading ? <div className="state"><div className="loading-line"><span /></div><p>Reyting yuklanmoqda…</p></div> : null}
    {!loading && error ? <div className="state"><b>Ma’lumot yuklanmadi</b><p>{error}</p></div> : null}
    {!loading && !error && items.length === 0 ? <div className="state rating-empty"><div className="state-icon">★</div><b>Hozircha reyting bo‘sh</b><p>Ushbu davrda tasdiqlangan donat yo‘q.</p></div> : null}

    {!loading && !error && items.length > 0 ? <>
      <div className="podium">
        {second && <div className="podium-person second">
          <Person item={second} /><span className="podium-rank">2</span>
          <strong>{second.name}</strong><small>{fmt(second.amount)}</small><div className="podium-base">2</div>
        </div>}
        {first && <div className="podium-person first">
          <div className="crown">1-O‘RIN</div><Person item={first} large /><span className="podium-rank">1</span>
          <strong>{first.name}</strong><small>{fmt(first.amount)}</small><div className="podium-base">1</div>
        </div>}
        {third && <div className="podium-person third">
          <Person item={third} /><span className="podium-rank">3</span>
          <strong>{third.name}</strong><small>{fmt(third.amount)}</small><div className="podium-base">3</div>
        </div>}
      </div>
      {rest.length > 0 && <div className="rating-list">
        {rest.map((item) => <div className="rating-row" key={item.rank}>
          <span className="rating-number">{item.rank}</span><Person item={item} />
          <strong>{item.name}</strong><span className="rating-amount">{fmt(item.amount)}</span>
        </div>)}
      </div>}
      <p className="rating-note">Reyting faqat balansga muvaffaqiyatli yozilgan to‘lovlar asosida hisoblanadi.</p>
    </> : null}
  </section>;
}
