import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Language = "uz" | "ru" | "en";

const translations: Record<Language, Record<string, string>> = {
  uz: {},
  ru: {
    "Donat do‘koni":"Магазин доната","Balans":"Баланс","Balansni to‘ldirish":"Пополнить баланс","Buyurtmalar":"Заказы","Profil":"Профиль","Yordam":"Поддержка","Qoidalar":"Правила","Bosh sahifa":"Главная","Do‘kon":"Магазин","Tarix":"История","To‘ldirish":"Пополнение","Top donatchilar":"Топ донатеров",
    "Xush kelibsiz,":"Добро пожаловать,","O‘yinchi":"Игрок","Joriy balans":"Текущий баланс","TITAN DONAT hisobi":"Счёт TITAN DONAT","Tezkor kirish":"Быстрый доступ","Kerakli bo‘lim":"Нужный раздел","Hisobingiz":"Ваш счёт","Oxirgi xarid":"Последняя покупка","ONESTATE donat":"Донат ONESTATE","Donat paketlari":"Пакеты доната","Support bilan aloqa":"Связаться с поддержкой","JAMOA":"СООБЩЕСТВО","Donatchilar reytingi":"Рейтинг донатеров","Top 10 donatchilar":"Топ-10 донатеров","Kunlik, oylik va yillik reyting":"Рейтинг за день, месяц и год","Barchasi":"Все","Donat va o‘yin xizmatlari":"Донат и игровые услуги","Boshqaruv markazi":"Панель управления","Admin panel":"Панель администратора","Orqaga":"Назад","Qayta urinish":"Повторить","Mini App’ni Telegram bot ichidagi tugma orqali oching.":"Откройте Mini App через кнопку внутри Telegram-бота.","TITANPAY yuklanmoqda…":"TITANPAY загружается…","ONESTATE RP DONAT XIZMATI":"СЕРВИС ДОНАТА ONESTATE RP","Donat paketlari va xizmatlar":"Пакеты доната и услуги","Batafsil":"Подробнее"
  },
  en: {
    "Donat do‘koni":"Donation shop","Balans":"Balance","Balansni to‘ldirish":"Top up balance","Buyurtmalar":"Orders","Profil":"Profile","Yordam":"Support","Qoidalar":"Rules","Bosh sahifa":"Home","Do‘kon":"Shop","Tarix":"History","To‘ldirish":"Top up","Top donatchilar":"Top donors",
    "Xush kelibsiz,":"Welcome,","O‘yinchi":"Player","Joriy balans":"Current balance","TITAN DONAT hisobi":"TITAN DONAT account","Tezkor kirish":"Quick access","Kerakli bo‘lim":"Quick links","Hisobingiz":"Your account","Oxirgi xarid":"Latest purchase","ONESTATE donat":"ONESTATE donations","Donat paketlari":"Donation packages","Support bilan aloqa":"Contact support","JAMOA":"COMMUNITY","Donatchilar reytingi":"Donor ranking","Top 10 donatchilar":"Top 10 donors","Kunlik, oylik va yillik reyting":"Daily, monthly and yearly ranking","Barchasi":"View all","Donat va o‘yin xizmatlari":"Donations and game services","Boshqaruv markazi":"Control center","Admin panel":"Admin panel","Orqaga":"Back","Qayta urinish":"Try again","Mini App’ni Telegram bot ichidagi tugma orqali oching.":"Open the Mini App using the button inside the Telegram bot.","TITANPAY yuklanmoqda…":"TITANPAY is loading…","ONESTATE RP DONAT XIZMATI":"ONESTATE RP DONATION SERVICE","Donat paketlari va xizmatlar":"Donation packages and services","Batafsil":"Details"
  }
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("titanpay-language");
      return saved === "ru" || saved === "en" ? saved : "uz";
    } catch { return "uz"; }
  });
  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem("titanpay-language", next); } catch {}
  };
  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (text: string) => translations[language][text] || text
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
