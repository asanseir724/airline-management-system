# راهنمای نصب دستی سیستم مدیریت آژانس هواپیمایی

این راهنما به شما کمک می‌کند تا سیستم مدیریت آژانس هواپیمایی را به صورت دستی نصب و راه‌اندازی کنید.

## پیش‌نیازها

قبل از شروع، از نصب موارد زیر اطمینان حاصل کنید:

- **Node.js**: نسخه 20 یا بالاتر
- **PostgreSQL**: نسخه 15 یا بالاتر
- **Git**: نسخه 2.30 یا بالاتر

## مراحل نصب

### 1. کلون کردن مخزن

```bash
# کلون کردن مخزن
git clone https://github.com/USERNAME/airline-management-system.git

# وارد شدن به دایرکتوری پروژه
cd airline-management-system
```

### 2. نصب وابستگی‌ها

```bash
# نصب وابستگی‌های Node.js
npm install
```

### 3. تنظیم متغیرهای محیطی

یک فایل `.env` در دایرکتوری اصلی پروژه ایجاد کنید:

```bash
# تنظیمات دیتابیس
DATABASE_URL=postgresql://username:password@localhost:5432/airline_management
PGUSER=username
PGPASSWORD=password
PGDATABASE=airline_management
PGHOST=localhost
PGPORT=5432

# تنظیمات امنیتی
SESSION_SECRET=یک_رشته_تصادفی_و_طولانی_برای_امنیت_جلسات

# تنظیمات سرویس پیامک (AmootSMS)
AMOOTSMS_TOKEN=توکن_سرویس_آموت

# (اختیاری) تنظیمات اولیه برای سرویس تلگرام
# TELEGRAM_BOT_TOKEN=توکن_ربات_تلگرام
# TELEGRAM_CHANNEL_ID=آیدی_کانال_تلگرام
```

**نکته**: مقادیر بالا را با اطلاعات واقعی سیستم خود جایگزین کنید.

### 4. ایجاد دیتابیس PostgreSQL

```bash
# وارد شدن به CLI پستگرس
sudo -u postgres psql

# ایجاد کاربر برای دیتابیس (اگر از قبل ایجاد نشده است)
CREATE USER username WITH PASSWORD 'password';

# ایجاد دیتابیس
CREATE DATABASE airline_management;

# اعطای دسترسی‌های لازم به کاربر
GRANT ALL PRIVILEGES ON DATABASE airline_management TO username;

# خروج از CLI پستگرس
\q
```

### 5. ایجاد جداول دیتابیس

```bash
# اجرای دستور مایگریشن دیتابیس
npm run db:push
```

### 6. اجرای برنامه در محیط توسعه

```bash
# اجرای برنامه در محیط توسعه
npm run dev
```

برنامه در آدرس `http://localhost:5000` قابل دسترسی خواهد بود.

### 7. ساخت نسخه تولید (Production Build)

```bash
# ساخت نسخه تولید
npm run build

# اجرای برنامه در محیط تولید
npm start
```

## تنظیم سرویس‌های خارجی

### تنظیم سرویس پیامک (AmootSMS)

1. در وب‌سایت [آموت‌اس‌ام‌اس](https://amootsms.com/) ثبت‌نام کنید
2. یک توکن API دریافت کنید
3. مقدار AMOOTSMS_TOKEN در فایل `.env` را با توکن دریافتی جایگزین کنید
4. آدرس IP سرور خود را در وایت‌لیست سرویس آموت اضافه کنید

### تنظیم ربات تلگرام

1. با [BotFather](https://t.me/botfather) در تلگرام چت کنید
2. با ارسال دستور `/newbot` یک ربات جدید بسازید
3. نام و نام کاربری ربات را وارد کنید
4. توکن API ربات را دریافت کنید
5. یک کانال تلگرام برای دریافت اعلان‌ها ایجاد کنید
6. ربات را به کانال اضافه کرده و به آن دسترسی ادمین بدهید
7. آیدی عددی کانال را پیدا کنید
8. مقادیر TELEGRAM_BOT_TOKEN و TELEGRAM_CHANNEL_ID در فایل `.env` را با مقادیر دریافتی جایگزین کنید

## عیب‌یابی

### خطا در اتصال به دیتابیس

اگر با خطای اتصال به دیتابیس مواجه شدید، موارد زیر را بررسی کنید:

```bash
# بررسی وضعیت سرویس PostgreSQL
sudo systemctl status postgresql

# اگر سرویس فعال نیست، آن را شروع کنید
sudo systemctl start postgresql

# بررسی امکان اتصال به دیتابیس
psql -U username -d airline_management

# بررسی مجدد متغیرهای محیطی در فایل .env
cat .env
```

### خطا در راه‌اندازی برنامه

اگر با خطا در راه‌اندازی برنامه مواجه شدید، موارد زیر را بررسی کنید:

```bash
# بررسی نصب صحیح وابستگی‌ها
npm install

# پاک کردن کش node_modules
rm -rf node_modules
npm install

# بررسی لاگ‌های خطا
npm run dev
```