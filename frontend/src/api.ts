declare global {
  interface Window {
    Telegram?: any;
  }
}

export const tg = window.Telegram?.WebApp;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Init-Data": tg?.initData || "",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Xatolik (${res.status})`;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail)) msg = "Kiritilgan ma'lumot noto'g'ri";
    } catch {}
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export const fmt = (n: number) => `${Number(n).toLocaleString("ru-RU")} UZS`;

export const STATUS_UZ: Record<string, string> = {
  pending: "Kutilmoqda",
  paid: "To'lov tasdiqlandi",
  queued: "Navbatda",
  processing: "Jarayonda",
  delivered: "Yetkazildi",
  error: "Xatolik",
  created: "Yaratildi",
  credited: "Balansga yozildi",
  mismatch: "Summa mos emas (tekshiruvda)",
  review: "Tekshiruvda",
  expired: "Muddati tugagan",
  rejected: "Rad etildi",
  mismatch_credited: "Tasdiqlandi (balansga)",
  open: "Ochiq",
  answered: "Javob berilgan",
};
