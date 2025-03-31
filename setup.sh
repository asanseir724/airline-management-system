#!/bin/bash

# رنگ‌ها برای خروجی زیباتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# نصب پکیج‌های مورد نیاز
echo -e "${YELLOW}در حال نصب وابستگی‌های پروژه...${NC}"
npm install

# ایجاد فایل‌های محیطی
echo -e "${YELLOW}در حال ایجاد فایل‌های محیطی...${NC}"
if [ ! -f .env ]; then
    echo "# متغیرهای محیطی
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/airline?schema=public
SESSION_SECRET=your_session_secret_here
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
echo "1. فایل .env را با اطلاعات واقعی پیکربندی کنید"
echo "2. برای اجرای پروژه، از دستور npm run dev استفاده کنید"
echo "3. برای دسترسی به برنامه، به آدرس http://localhost:5000 مراجعه کنید"
echo "4. نام کاربری و رمز عبور پیش‌فرض: skyro / 123456"

# پایان اسکریپت