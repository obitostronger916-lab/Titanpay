# Xavfsizlik tekshiruvi

## Kodda bor
- [x] Telegram initData serverda HMAC bilan tekshiriladi, 24 soatdan eski rad etiladi
- [x] Admin faqat `ADMIN_ID` (server konfiguratsiyasi), barcha `/api/admin/*` himoyalangan
- [x] Webhook imzosi tekshiriladi; `PAYMENT_WEBHOOK_SECRET` bo'sh bo'lsa webhook rad etiladi
- [x] Kalitlar kodda emas, faqat environment'da
- [x] SQLAlchemy parametrlangan so'rovlar (SQL injection yo'q)
- [x] Balans o'zgarishi bitta transaksiyada, qator qulflanadi (`FOR UPDATE`), DB'da `balance >= 0`
- [x] Idempotency: ledger'da `(kind, ref_type, ref_id)` unikal; `provider_tx_id` unikal
- [x] 1 UZS farq bo'lsa avtomatik yozilmaydi; admin tasdiqlagach to'langan summa yoziladi
- [x] Chek rasmi hech qayerda to'lov tasdig'i emas
- [x] Foydalanuvchi faqat o'z buyurtma/to'lov/murojaatlarini ko'radi (tekshirilgan sinovlarda)
- [x] Admin amallari `audit_log`ga yoziladi
- [x] API yo'q bo'lsa buyurtma "Yetkazildi" bo'lmaydi; Idempotency-Key bilan takroriy yuborishdan himoya

## Deploydan oldin qo'lda tekshiring
- [ ] `ADMIN_ID` faqat sizning ID'ingiz
- [ ] `BOT_TOKEN` hech qachon GitHub'ga tushmagan (tushgan bo'lsa BotFather'da yangilang)
- [ ] `PAYMENT_WEBHOOK_SECRET` uzun va tasodifiy
- [ ] Haqiqiy provayderda sandbox sinovi o'tgan
- [ ] PostgreSQL'da bir vaqtda ikkita xaridni sinab ko'rish (SQLite bu holatni ishonchli sinamaydi)
- [ ] Render DB zaxira nusxasi yoqilgan

## Ma'lum bo'shliqlar
- Rate limiting yo'q
- initData qayta ishlatilishiga (replay) qarshi faqat 24 soatlik muddat bor
- Rasm URL'lari tashqi manzil: faqat ishonchli manbalarni kiriting
