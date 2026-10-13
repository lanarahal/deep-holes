# موسیقی‌های قابل‌جایگزینی Deep Holes

موسیقی‌ها اختیاری‌اند. فایل MP3 را دقیقاً با نام و مسیر زیر اضافه کن؛ اگر فایل آن بخش نباشد یا قابل‌خواندن نباشد، بازی خودکار موسیقی procedural فعلی را پخش می‌کند. هنگام تغییر مسیرها نیازی به تغییر کد نیست.

## سطح زمین

| بخش | فایل |
|---|---|
| چمنزار | `music/surface/meadow.mp3` |
| بیابان | `music/surface/desert.mp3` |
| برف | `music/surface/snow.mp3` |
| منطقهٔ جادویی | `music/surface/fairy.mp3` |
| جنگل | `music/surface/jungle.mp3` |

## لایه‌های نقشهٔ زیرزمین

| لایه | فایل |
|---:|---|
| ۱ – خاک سطحی | `music/underground/layer-1-topsoil.mp3` |
| ۲ – رس | `music/underground/layer-2-clay.mp3` |
| ۳ – شن | `music/underground/layer-3-gravel.mp3` |
| ۴ – سنگ | `music/underground/layer-4-stone.mp3` |
| ۵ – گورستان استخوان | `music/underground/layer-5-boneyard.mp3` |
| ۶ – رگهٔ طلا | `music/underground/layer-6-gold-vein.mp3` |
| ۷ – غار کریستال | `music/underground/layer-7-crystal-cave.mp3` |
| ۸ – ماگما | `music/underground/layer-8-magma.mp3` |
| ۹ – عمق تکرارشونده | `music/underground/layer-9-deep-topsoil.mp3` |
| ۱۰ – عمق تکرارشونده | `music/underground/layer-10-deep-magma.mp3` |

## داخل لانه، کافه و مهمانی

| بخش | فایل |
|---|---|
| طبقهٔ ۱ لانه | `music/burrows/floor-1.mp3` |
| طبقهٔ ۲ لانه | `music/burrows/floor-2.mp3` |
| طبقهٔ ۳ لانه | `music/burrows/floor-3.mp3` |
| طبقهٔ ۴ لانه | `music/burrows/floor-4.mp3` |
| طبقهٔ ۵ لانه | `music/burrows/floor-5.mp3` |
| طبقهٔ ۶ لانه | `music/burrows/floor-6.mp3` |
| طبقهٔ ۷ لانه | `music/burrows/floor-7.mp3` |
| طبقهٔ ۸ لانه | `music/burrows/floor-8.mp3` |
| طبقهٔ ۹ لانه | `music/burrows/floor-9.mp3` |
| طبقهٔ ۱۰ و بالاتر لانه | `music/burrows/floor-10.mp3` |
| کافه | `music/cafe/cafe.mp3` |
| مهمانی | `music/party/party.mp3` |

## نکته‌های استفاده

- برای شروع، MP3 استریو با نرخ نمونه‌برداری ۴۴٫۱ یا ۴۸ کیلوهرتز مناسب است. موسیقی باید loop-friendly باشد؛ پخش فایل به شکل حلقه‌ای انجام می‌شود و هنگام جابه‌جایی بین بخش‌ها crossfade دارد.
- تا جای ممکن فایل‌ها را با صدای متعادل و بدون clipping خروجی بگیر؛ بلندی نهایی همچنان از تنظیم «Music volume» کنترل می‌شود.
- بعد از افزودن/جایگزینی آهنگ، صفحه را دوباره بارگذاری کن. اگر مرورگر هنوز نسخهٔ قدیمی را پخش کرد، مقدار `MUSIC_VERSION` در `js/audio.js` را یک واحد زیاد کن.
- فایل‌های MP3 ممکن است حجم زیادی داشته باشند؛ آهنگ‌های کوتاه‌تر/بهینه‌شده، زمان بارگذاری و مصرف داده را پایین می‌آورند.
- پوشه‌های خالی `music/` با فایل `.keep` نگه‌داری می‌شوند و نبودن MP3 خطا در بازی ایجاد نمی‌کند.
