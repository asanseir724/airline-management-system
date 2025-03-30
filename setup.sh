#!/bin/bash
# setup.sh - اسکریپت نصب سیستم مدیریت آژانس هواپیمایی

# پردازش پارامترهای ورودی
while [ $# -gt 0 ]; do
  case "$1" in
    --db-user=*)
      DB_USER="${1#*=}"
      ;;
    --db-password=*)
      DB_PASSWORD="${1#*=}"
      ;;
    --db-name=*)
      DB_NAME="${1#*=}"
      ;;
    --api-token=*)
      API_TOKEN="${1#*=}"
      ;;
    *)
      printf "***************************\n"
      printf "* پارامتر نامعتبر: $1\n"
      printf "***************************\n"
      exit 1
  esac
  shift
done

# بررسی وجود پارامترهای ضروری
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ] || [ -z "$API_TOKEN" ]; then
  printf "خطا: تمام پارامترهای ضروری را وارد کنید\n"
  printf "مثال استفاده: ./setup.sh --db-user=postgres --db-password=postgres --db-name=airline_management --api-token=YOUR_AMOOTSMS_TOKEN\n"
  exit 1
fi

printf "🚀 شروع نصب سیستم مدیریت آژانس هواپیمایی...\n\n"

# بررسی پیش‌نیازها
printf "✅ بررسی پیش‌نیازها...\n"
command -v node >/dev/null 2>&1 || { printf "❌ Node.js نصب نیست. لطفا آن را از https://nodejs.org نصب کنید.\n"; exit 1; }
command -v npm >/dev/null 2>&1 || { printf "❌ npm نصب نیست. لطفا Node.js را مجدداً نصب کنید.\n"; exit 1; }
command -v psql >/dev/null 2>&1 || { printf "❌ PostgreSQL نصب نیست. لطفا آن را از https://www.postgresql.org نصب کنید.\n"; exit 1; }
command -v git >/dev/null 2>&1 || { printf "❌ Git نصب نیست. لطفا آن را از https://git-scm.com نصب کنید.\n"; exit 1; }

# نصب وابستگی‌ها
printf "📦 نصب وابستگی‌های نرم‌افزاری...\n"
npm install

# ایجاد فایل .env
printf "⚙️ تنظیم متغیرهای محیطی...\n"
cat > .env << EOL
# تنظیمات دیتابیس
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
PGUSER=${DB_USER}
PGPASSWORD=${DB_PASSWORD}
PGDATABASE=${DB_NAME}
PGHOST=localhost
PGPORT=5432

# تنظیمات امنیتی
SESSION_SECRET=$(openssl rand -hex 32)

# تنظیمات سرویس پیامک (AmootSMS)
AMOOTSMS_TOKEN=${API_TOKEN}
EOL

# ایجاد دیتابیس
printf "🗄️ تنظیم دیتابیس PostgreSQL...\n"
if psql -lqt | cut -d \| -f 1 | grep -qw ${DB_NAME}; then
  printf "دیتابیس ${DB_NAME} از قبل وجود دارد.\n"
else
  PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};" || { printf "❌ خطا در ایجاد دیتابیس\n"; exit 1; }
  printf "دیتابیس ${DB_NAME} با موفقیت ایجاد شد.\n"
fi

# اجرای مایگریشن‌های دیتابیس
printf "🗃️ ایجاد جداول دیتابیس...\n"
npm run db:push

# ساخت نسخه تولید
printf "🏗️ ساخت نسخه تولید (Production Build)...\n"
npm run build

printf "\n✨ نصب سیستم مدیریت آژانس هواپیمایی با موفقیت انجام شد!\n"
printf "🌐 برای استفاده از برنامه در حالت توسعه: npm run dev\n"
printf "🚀 برای استفاده از برنامه در حالت تولید: npm start\n"
printf "📖 برای اطلاعات بیشتر به فایل README.md مراجعه کنید.\n"