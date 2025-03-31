# سامانه مدیریت درخواست‌های آژانس هواپیمایی

این پروژه یک سامانه جامع برای مدیریت درخواست‌های کنسلی، استرداد، و تغییر بلیط در آژانس‌های هواپیمایی است که قابلیت ارسال پیامک و اطلاع‌رسانی از طریق تلگرام را دارد.

## ویژگی‌ها

- ثبت و مدیریت درخواست‌های استرداد داخلی
- ثبت و پیگیری درخواست‌های استرداد مشتریان
- ارسال پیامک خودکار در تغییر وضعیت‌ها
- ارسال اطلاعیه در کانال تلگرام
- پشتیبان‌گیری خودکار از اطلاعات
- مدیریت تورهای گردشگری (در حال حاضر غیرفعال)
- مدیریت سیستم و گزارش‌گیری

## نصب و راه‌اندازی سریع

### پیش‌نیازها

فقط نیاز به موارد زیر دارید:
- سیستم عامل لینوکس (Ubuntu/Debian) یا macOS
- دسترسی به اینترنت برای نصب وابستگی‌ها
- دسترسی sudo (برای نصب خودکار وابستگی‌ها)

اسکریپت نصب، تمام وابستگی‌های زیر را به صورت خودکار نصب و پیکربندی می‌کند:
- Node.js نسخه 20
- PostgreSQL
- پکیج‌های npm مورد نیاز
- دیتابیس و کاربر PostgreSQL

### نصب با یک دستور (کاملاً خودکار)

فقط کافیست دستور زیر را اجرا کنید:

```bash
bash setup.sh
```

این اسکریپت به صورت کاملاً خودکار:
1. Node.js را بررسی و در صورت نیاز نصب می‌کند
2. PostgreSQL را بررسی و در صورت نیاز نصب می‌کند
3. کاربر و دیتابیس PostgreSQL را ایجاد و پیکربندی می‌کند
4. تمامی وابستگی‌های npm را نصب می‌کند
5. فایل‌های محیطی (.env) را با تنظیمات مناسب ایجاد می‌کند
6. مایگریشن‌های دیتابیس را اعمال می‌کند
7. راهنمای اجرا و اطلاعات اتصال به دیتابیس را نمایش می‌دهد

### نصب دستی (در صورت نیاز)

اگر اسکریپت خودکار با مشکل مواجه شد یا می‌خواهید به صورت دستی نصب کنید:

1. نصب Node.js نسخه 20+
2. نصب PostgreSQL 
3. ایجاد کاربر و دیتابیس:
```bash
# در لینوکس
sudo -u postgres psql -c "CREATE USER airlineadmin WITH PASSWORD 'airlinepass';"
sudo -u postgres psql -c "CREATE DATABASE airline;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE airline TO airlineadmin;"

# در macOS
createuser -s airlineadmin
psql -c "ALTER USER airlineadmin WITH PASSWORD 'airlinepass';" postgres
createdb -O airlineadmin airline
```

4. ایجاد فایل .env در مسیر اصلی پروژه:
```
DATABASE_URL=postgresql://airlineadmin:airlinepass@localhost:5432/airline
PGHOST=localhost
PGPORT=5432
PGUSER=airlineadmin
PGPASSWORD=airlinepass
PGDATABASE=airline
SESSION_SECRET=your_session_secret_here
AMOOTSMS_TOKEN=your_amootsms_token_here
```

5. نصب وابستگی‌ها و اعمال مایگریشن‌ها:
```bash
npm install
npm run db:push
```

6. اجرای برنامه:
```bash
npm run dev
```

## راهنمای استفاده

### اطلاعات ورود به سیستم
- **نام کاربری**: skyro
- **رمز عبور**: 123456

### امکانات اصلی
- **داشبورد**: نمایش خلاصه وضعیت سیستم و آمار درخواست‌ها
- **مدیریت درخواست‌ها**: ثبت و پیگیری درخواست‌های استرداد داخلی
- **فرم درخواست جدید**: ایجاد درخواست جدید برای کارمندان
- **مدیریت پیامک‌ها**: تنظیم قالب‌های پیامک و مشاهده تاریخچه ارسال
- **اتصال به تلگرام**: تنظیم ربات تلگرام برای اطلاع‌رسانی
- **بک‌آپ‌گیری**: تنظیمات پشتیبان‌گیری خودکار و مشاهده تاریخچه
- **مدیریت سیستم**: لاگ‌های سیستم و تنظیمات عمومی

## راهنمای فعال‌سازی سیستم تور

سیستم تور در حال حاضر غیرفعال است. برای فعال‌سازی مجدد:

1. فایل `client/src/components/airline-layout.tsx` را باز کنید
2. بخش کامنت شده مربوط به تور را از حالت کامنت خارج کنید:
```jsx
// سیستم تور غیرفعال است - برای فعال‌سازی مجدد، کامنت زیر را بردارید
{
  title: "سیستم تورهای گردشگری",
  items: tourSystemItems,
}
```

## فناوری‌های استفاده شده

- **Frontend**: React، TypeScript، Tailwind CSS، Shadcn UI
- **Backend**: Node.js، Express
- **Database**: PostgreSQL، Drizzle ORM
- **Authentication**: Passport.js
- **Notifications**: AmootSMS API، Telegram Bot API
- **Data Extraction**: Puppeteer، Cheerio، API Scrapers