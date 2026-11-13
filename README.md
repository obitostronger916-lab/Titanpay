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

1. Rasmiy API hujjatlari, autentifikatsiya talablari va sandbox ma'lumotlari olinmaguncha `ONESTATE_DELIVERY_ENABLED=false` holatida qoldiring.
2. Hujjatlar kelgach `app/delivery/onestate.py` ichidagi `deliver()` so'rovini aynan rasmiy formatga moslang; idempotency qo'llab-quvvatlanishini ham hujjatdan tekshiring.
3. Sandbox'da muvaffaqiyat, rad etish, timeout va takroriy so'rov holatlarini tekshiring.
4. Faqat moslashtirish va sinovlar tugagach, Render'da `ONESTATE_DELIVERY_ENABLED=true` qiling. URL va API keyning o'zi yetkazishni yoqmaydi.

## Cheklovlar va keyingi ishlar

- Migratsiya vositasi (Alembic) hali yo'q: jadvallar `create_all` bilan yaratiladi. Jadval o'zgarganda boshqariladigan migratsiya qo'shish kerak.
- Birinchi deployda web va bot bir vaqtda jadval yaratishga urinishi mumkin; xato chiqsa botni "Manual Deploy" bilan qayta ishga tushiring.
- So'rovlar uchun umumiy rate limit hali yo'q; ko'p nusxali Render ishga tushirishida ishlaydigan tashqi limitlash kerak.
- UzCard/Humo provayderi tanlanib, integratsiya qilinmaguncha to'lovlar yopiq turadi.
- ONESTATE RP rasmiy API hujjatlari va sandbox sinovlari bo'lmaguncha yetkazish bayrog'i o'chiq; URL va kalitning o'zi worker'ni ishga tushirmaydi. Noaniq natijalar qo'lda tekshiruvga o'tadi.
- To'lov muddati (`expires_at`) supportga murojaat oynasini belgilaydi; kechikkan webhook holati alohida tekshiriladi.
