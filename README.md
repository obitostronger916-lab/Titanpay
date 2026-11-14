# TITAN DONAT

ONESTATE RP uchun Telegram bot + Mini App donat platformasi.
Stack: FastAPI, aiogram 3, PostgreSQL, React + TypeScript, Render.

## Holat (halol ro'yxat)

| Qism | Holat |
|---|---|
| Balans, buyurtma, support, admin panel, bot | Yozilgan |
| UzCard/Humo to'lov provayderi | **Ulanmagan.** Balans to'ldirish 503 qaytaradi |
| ONESTATE RP API | **Ulanmagan.** Buyurtmalar "Navbatda" turadi |
| Sinovlar | Yozilgan, GitHub Actions'da yuradi |

## Papkalar

```
app/        backend (API, ledger, adapterlar)
bot/        Telegram bot (worker)
frontend/   React Mini App
tests/      sinovlar
render.yaml Render blueprint
```

## Render'ga joylash (telefondan)

1. Kodni GitHub repoga yuklang (GitHub ilovasi yoki Termux: `git add . && git commit -m init && git push`).
2. GitHub → **Actions** bo'limida CI yashil bo'lishini kuting. Qizil bo'lsa, xato matnini yuboring.
3. Render → **New → Blueprint** → reponi tanlang.
4. Render so'ragan o'zgaruvchilarni kiriting:
   - `BOT_TOKEN`: BotFather'dan
   - `ADMIN_ID`: sizning Telegram ID (yagona admin)
   - `WEBAPP_URL`: web servis manzili (`https://....onrender.com`); birinchi deploydan keyin kiritib, qayta deploy qiling
   - `PAYMENT_WEBHOOK_SECRET`: tasodifiy uzun matn
   - `ONESTATE_API_URL`, `ONESTATE_API_KEY`: hozircha bo'sh
5. Deploy tugagach `https://<manzil>/health` ochib tekshiring.
6. Telegramda botga `/start` yozing, "TITAN DONAT" tugmasini bosing.
7. Admin sifatida Mini App → **Admin panel** → **Mahsulotlar** orqali mahsulot qo'shing.

`.env` fayl Render'ga yuklanmaydi: kalitlar faqat Render → Environment'da turadi.

## Lokal ishga tushirish

```bash
pip install -r requirements.txt
cp .env.example .env        # qiymatlarni to'ldiring
uvicorn app.main:app --reload
python -m bot.main          # alohida terminalda
cd frontend && npm install && npm run dev
```
Lokal rejimda SQLite ishlatiladi. Haqiqiy pul oqimini PostgreSQL'da sinang.

## Sinovlar

```bash
pytest -q
```

## To'lov provayderini ulash (provayder tanlangach)

1. `app/providers/<nom>.py` yarating, `PaymentProvider`dan meros oling:
   `create_invoice` (to'lov sahifasi/karta ma'lumoti) va `parse_webhook` (provayder formatini `VerifiedEvent`ga o'giring).
2. `app/providers/__init__.py` ichidagi `REGISTRY`ga qo'shing.
3. Render'da `PAYMENT_PROVIDER=<nom>` qiling.
4. `app/security.py`dagi `verify_webhook_signature` hozir umumiy HMAC-SHA256 (`X-Signature` sarlavhasi). Provayder imzo usuli boshqacha bo'lsa, shuni moslang.
5. Provayder sandbox'ida: aniq summa, 1 UZS farq, takroriy webhook holatlarini sinang.

## ONESTATE RP API'ni ulash (hujjat kelgach)

1. Render'da `ONESTATE_API_URL` va `ONESTATE_API_KEY` ni kiriting.
2. `app/delivery/onestate.py` ichidagi `deliver()` so'rov formati **taxminiy**: rasmiy hujjatga moslang (autentifikatsiya, maydonlar, muvaffaqiyat/xato kodlari).
3. Navbatda turgan buyurtmalar ishchi tomonidan avtomatik yuboriladi.

## Cheklovlar va keyingi ishlar

- Migratsiya vositasi (Alembic) hali yo'q: jadvallar `create_all` bilan yaratiladi. Jadval o'zgarganda boshqariladigan migratsiya qo'shish kerak.
- Birinchi deployda web va bot bir vaqtda jadval yaratishga urinishi mumkin; xato chiqsa botni "Manual Deploy" bilan qayta ishga tushiring.
- So'rovlar uchun umumiy rate limit hali yo'q; ko'p nusxali Render ishga tushirishida ishlaydigan tashqi limitlash kerak.
- UzCard/Humo provayderi tanlanib, integratsiya qilinmaguncha to'lovlar yopiq turadi.
- ONESTATE RP rasmiy API hujjatlari olinmaguncha avtomatik yetkazish yoqilmaydi; noaniq natijalar qo'lda tekshiruvga o'tadi.
- To'lov muddati (`expires_at`) supportga murojaat oynasini belgilaydi; kechikkan webhook holati alohida tekshiriladi.


## Donatchilar reytingi

Mini App bosh sahifasidagi **Top 10 donatchilar** bo'limida kunlik, oylik va yillik reyting ko'rsatiladi. Reyting faqat balansga yozilgan tasdiqlangan to'lovlarni (shu jumladan admin tasdiqlagan summa farqlarini) hisoblaydi. To'lovlar Toshkent vaqti bo'yicha davrlarga ajratiladi. Ommaviy javobda faqat o'rin, ko'rsatiladigan ism, jami summa va ruxsat etilgan Telegram avatar manzili beriladi.
