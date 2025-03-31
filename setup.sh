#!/bin/bash

# رنگ‌ها برای خروجی زیباتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # بدون رنگ

echo -e "${YELLOW}شروع نصب و راه‌اندازی پروژه مدیریت آژانس هواپیمایی${NC}"
echo "======================================================"

# بررسی نصب بودن Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js نصب نیست. در حال نصب Node.js...${NC}"
    
    # نصب Node.js با استفاده از nvm یا مستقیم با توجه به سیستم عامل
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # لینوکس
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install node
    else
        echo "سیستم عامل شما پشتیبانی نمی‌شود. لطفاً Node.js را به صورت دستی نصب کنید."
        exit 1
    fi
else
    echo -e "${GREEN}Node.js قبلاً نصب شده است.${NC}"
fi

# بررسی نصب بودن PostgreSQL
install_postgres() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # نصب PostgreSQL در لینوکس
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        
        # شروع سرویس
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
        # ایجاد کاربر و دیتابیس
        echo -e "${YELLOW}در حال ایجاد کاربر و دیتابیس PostgreSQL...${NC}"
        sudo -u postgres psql -c "CREATE USER airlineadmin WITH PASSWORD 'airlinepass';"
        sudo -u postgres psql -c "CREATE DATABASE airline;"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE airline TO airlineadmin;"
        sudo -u postgres psql -c "ALTER USER airlineadmin WITH SUPERUSER;"
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # نصب PostgreSQL در macOS
        brew install postgresql
        
        # شروع سرویس
        brew services start postgresql
        
        # ایجاد کاربر و دیتابیس
        echo -e "${YELLOW}در حال ایجاد کاربر و دیتابیس PostgreSQL...${NC}"
        createuser -s airlineadmin
        psql -c "ALTER USER airlineadmin WITH PASSWORD 'airlinepass';"
        createdb -O airlineadmin airline
    else
        echo -e "${RED}سیستم عامل شما پشتیبانی نمی‌شود. لطفاً PostgreSQL را به صورت دستی نصب کنید.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}PostgreSQL با موفقیت نصب و پیکربندی شد.${NC}"
    return 0
}

# بررسی PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL نصب نیست. در حال نصب PostgreSQL...${NC}"
    install_postgres
    if [ $? -ne 0 ]; then
        echo -e "${RED}خطا در نصب PostgreSQL.${NC}"
        echo -e "${YELLOW}لطفاً PostgreSQL را به صورت دستی نصب کنید و سپس اسکریپت را دوباره اجرا کنید.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}PostgreSQL قبلاً نصب شده است.${NC}"
    
    # بررسی وجود دیتابیس
    if ! psql -lqt | cut -d \| -f 1 | grep -qw airline; then
        echo -e "${YELLOW}دیتابیس 'airline' وجود ندارد. در حال ایجاد...${NC}"
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo -u postgres psql -c "CREATE USER airlineadmin WITH PASSWORD 'airlinepass';"
            sudo -u postgres psql -c "CREATE DATABASE airline;"
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE airline TO airlineadmin;"
            sudo -u postgres psql -c "ALTER USER airlineadmin WITH SUPERUSER;"
        else
            createuser -s airlineadmin 2>/dev/null || true
            psql -c "ALTER USER airlineadmin WITH PASSWORD 'airlinepass';" postgres
            createdb -O airlineadmin airline 2>/dev/null || true
        fi
        
        echo -e "${GREEN}دیتابیس 'airline' با موفقیت ایجاد شد.${NC}"
    else
        echo -e "${GREEN}دیتابیس 'airline' از قبل وجود دارد.${NC}"
    fi
fi

# ایجاد SESSION_SECRET تصادفی
SESSION_SECRET=$(openssl rand -hex 32)

# نصب پکیج‌های مورد نیاز
echo -e "${YELLOW}در حال نصب وابستگی‌های پروژه...${NC}"
npm install

# ایجاد فایل‌های محیطی
echo -e "${YELLOW}در حال ایجاد فایل‌های محیطی...${NC}"
if [ ! -f .env ]; then
    echo "# متغیرهای محیطی
DATABASE_URL=postgresql://airlineadmin:airlinepass@localhost:5432/airline?schema=public
PGHOST=localhost
PGPORT=5432
PGUSER=airlineadmin
PGPASSWORD=airlinepass
PGDATABASE=airline
SESSION_SECRET=${SESSION_SECRET}
AMOOTSMS_TOKEN=your_amootsms_token_here
" > .env
    echo -e "${GREEN}فایل .env ایجاد شد.${NC}"
else
    echo -e "${GREEN}فایل .env از قبل وجود دارد.${NC}"
fi

# اجرای مایگریشن دیتابیس
echo -e "${YELLOW}در حال اعمال مایگریشن‌های دیتابیس...${NC}"
npm run db:push

# راه‌اندازی پروژه
echo -e "${GREEN}نصب و راه‌اندازی با موفقیت انجام شد!${NC}"
echo -e "${YELLOW}برای اجرای پروژه، دستور زیر را وارد کنید:${NC}"
echo -e "${GREEN}npm run dev${NC}"

echo "======================================================"
echo -e "${YELLOW}راهنمای استفاده:${NC}"
echo "1. برای اجرای پروژه، از دستور npm run dev استفاده کنید"
echo "2. برای دسترسی به برنامه، به آدرس http://localhost:5000 مراجعه کنید"
echo "3. نام کاربری و رمز عبور پیش‌فرض: skyro / 123456"
echo "4. برای استفاده از سیستم پیامک، مقدار AMOOTSMS_TOKEN را در فایل .env تنظیم کنید"

echo -e "${YELLOW}اطلاعات اتصال به دیتابیس:${NC}"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: airline"
echo "Username: airlineadmin"
echo "Password: airlinepass"
echo "Connection URL: postgresql://airlineadmin:airlinepass@localhost:5432/airline"

# پایان اسکریپت