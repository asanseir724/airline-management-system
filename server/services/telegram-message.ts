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

export interface ExtendedTourData {
  id: number;
  title: string;
  description: string | null;
  price: string | null;
  duration: string | null;
  imageUrl: string | null;
  originalUrl: string | null;
  destinationId: number | null;
  brandId: number | null;
  sourceId: number | null;
  isPublished: boolean;
  metadata: Record<string, any> | null;
  services: any;
  hotels: any;
  requiredDocuments: any;
  cancellationPolicy: string | null;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
  scrapedAt: Date;
}

export function generateTelegramMessage(tour: ExtendedTourData): string {
  // عنوان تور
  let message = `*🌟 تور گردشگری ${tour.title} 🌟*\n\n`;
  
  // توضیحات کوتاه
  if (tour.description) {
    message += `${tour.description.split('\n')[0]}\n\n`;
  }
  
  // خدمات تور
  message += `*✨ خدمات تور:*\n\n`;
  if (tour.services && Array.isArray(tour.services) && tour.services.length > 0) {
    tour.services.forEach((service: any) => {
      message += `✅ ${service}\n`;
    });
    message += '\n';
  } else {
    message += `اطلاعات خدمات در دسترس نیست.\n\n`;
  }
  
  // اطلاعات هتل‌ها
  message += `*🏨 لیست هتل‌ها بر اساس ستاره:*\n\n`;
  
  console.log("Hotels in message generator:", tour.hotels);
  
  if (tour.hotels && Array.isArray(tour.hotels) && tour.hotels.length > 0) {
    try {
      // مرتب سازی هتل‌ها بر اساس تعداد ستاره (از کم به زیاد)
      // اول مطمئن شویم که همه هتل‌ها دارای فیلد stars هستند
      const validHotels = tour.hotels.filter((hotel: any) => 
        hotel && typeof hotel === 'object' && 'stars' in hotel && typeof hotel.stars === 'number'
      );
      
      if (validHotels.length > 0) {
        const sortedHotels = [...validHotels].sort((a: any, b: any) => a.stars - b.stars);
        
        sortedHotels.forEach((hotel: Hotel) => {
          const stars = starsToEmoji(hotel.stars || 0);
          const price = hotel.price && hotel.price !== 'نامشخص' ? `- قیمت: ${hotel.price}` : '';
          message += `${stars} هتل ${hotel.name || 'نامشخص'} ${price}\n`;
        });
      } else {
        message += `اطلاعات هتل در دسترس نیست (هتل‌ها بدون ستاره).\n`;
      }
    } catch (error) {
      console.error("Error processing hotels for telegram message:", error);
      message += `خطا در پردازش اطلاعات هتل.\n`;
    }
    message += '\n';
  } else {
    message += `اطلاعات هتل در دسترس نیست.\n\n`;
  }
  
  // مدارک مورد نیاز
  if (tour.requiredDocuments && Array.isArray(tour.requiredDocuments) && tour.requiredDocuments.length > 0) {
    message += `*📄 مدارک مورد نیاز:*\n\n`;
    tour.requiredDocuments.forEach((doc: any) => {
      message += `• ${doc}\n`;
    });
    message += '\n';
  }
  
  // قوانین کنسلی
  if (tour.cancellationPolicy) {
    message += `*⚠️ قوانین کنسلی:*\n${tour.cancellationPolicy}\n\n`;
  }
  
  // اطلاعات تماس و پایان پیام
  message += `*📢 جهت رزرو تور با ما تماس بگیرید!*\n\n`;
  message += `*📞 شماره تماس:* 02191300545\n\n`;
  
  // لینک تور اگر موجود باشد
  if (tour.originalUrl) {
    message += `*🔗 لینک تور:* ${tour.originalUrl}\n\n`;
  } else if (tour.link) {
    message += `*🔗 لینک تور:* ${tour.link}\n\n`;
  }
  
  message += `*⏳ فرصت محدود! همین حالا اقدام کنید! 🌍*`;
  
  return message;
}