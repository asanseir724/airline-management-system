import { TourData } from "@shared/schema";

/**
 * تبدیل عدد ستاره به نمایش ایموجی ستاره
 * @param starCount تعداد ستاره
 * @returns رشته ایموجی ستاره
 */
function starsToEmoji(starCount: number): string {
  return '⭐️'.repeat(starCount);
}

/**
 * تابع تولید پیام تلگرام برای هر تور
 * @param tour اطلاعات تور
 * @returns متن فرمت شده برای تلگرام
 */
type Hotel = {
  name: string;
  imageUrl: string;
  rating: string;
  stars: number;
  price: string;
}

interface ExtendedTourData extends TourData {
  services?: string[];
  hotels?: Hotel[];
  requiredDocuments?: string[];
  cancellationPolicy?: string;
  link?: string;
}

export function generateTelegramMessage(tour: ExtendedTourData): string {
  // عنوان تور
  let message = `🌟 تور گردشگری ${tour.title} 🌟\n\n`;
  
  // توضیحات کوتاه
  if (tour.description) {
    message += `${tour.description.split('\n')[0]}\n\n`;
  }
  
  // خدمات تور
  message += `✨ خدمات تور:\n\n`;
  if (tour.services && tour.services.length > 0) {
    tour.services.forEach(service => {
      message += `✅ ${service}\n`;
    });
    message += '\n';
  } else {
    message += `اطلاعات خدمات در دسترس نیست.\n\n`;
  }
  
  // اطلاعات هتل‌ها
  message += `🏨 لیست هتل‌ها بر اساس ستاره:\n\n`;
  if (tour.hotels && tour.hotels.length > 0) {
    // مرتب سازی هتل‌ها بر اساس تعداد ستاره (از کم به زیاد)
    const sortedHotels = [...tour.hotels].sort((a, b) => a.stars - b.stars);
    
    sortedHotels.forEach(hotel => {
      const stars = starsToEmoji(hotel.stars);
      const price = hotel.price !== 'نامشخص' ? `- قیمت: ${hotel.price}` : '';
      message += `${stars} هتل ${hotel.name} ${price}\n`;
    });
    message += '\n';
  } else {
    message += `اطلاعات هتل در دسترس نیست.\n\n`;
  }
  
  // مدارک مورد نیاز
  if (tour.requiredDocuments && tour.requiredDocuments.length > 0) {
    message += `📄 مدارک مورد نیاز:\n\n`;
    tour.requiredDocuments.forEach(doc => {
      message += `• ${doc}\n`;
    });
    message += '\n';
  }
  
  // قوانین کنسلی
  if (tour.cancellationPolicy) {
    message += `⚠️ قوانین کنسلی:\n${tour.cancellationPolicy}\n\n`;
  }
  
  // اطلاعات تماس و پایان پیام
  message += `📢 جهت رزرو تور با ما تماس بگیرید!\n\n`;
  message += `📞 شماره تماس: 02191300545\n\n`;
  
  // لینک تور اگر موجود باشد
  if (tour.originalUrl) {
    message += `🔗 لینک تور: ${tour.originalUrl}\n\n`;
  } else if (tour.link) {
    message += `🔗 لینک تور: ${tour.link}\n\n`;
  }
  
  message += `⏳ فرصت محدود! همین حالا اقدام کنید! 🌍`;
  
  return message;
}