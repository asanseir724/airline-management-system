import { storage } from "../storage";
import { InsertTourData, TourSource } from "@shared/schema";

/**
 * سرویس اسکرپ کردن داده‌های تور
 * این سرویس به عنوان یک نمونه ساده اطلاعات فرضی ایجاد می‌کند
 * در نسخه‌های واقعی از puppeteer یا selenium برای اسکرپ کردن استفاده می‌شود
 */
export async function scrapeTourSource(source: TourSource): Promise<boolean> {
  try {
    // لاگ شروع اسکرپ
    await storage.createTourLog({
      level: "INFO",
      message: `شروع اسکرپ منبع "${source.name}"`,
      content: `URL: ${source.url}`
    });

    // حذف داده‌های قبلی این منبع
    await storage.deleteTourDataBySourceId(source.id);
    
    // تعداد تورهایی که می‌خواهیم تولید کنیم
    const numberOfTours = Math.floor(Math.random() * 6) + 8; // بین 8 تا 13 تور
    
    // تولید داده برای تعداد مشخص شده تور
    for (let i = 0; i < numberOfTours; i++) {
      // انتخاب مقصد تصادفی
      const destination = getRandomDestination();
      
      // انتخاب مدت زمان تور
      const duration = `${Math.floor(Math.random() * 10) + 2} روز`;
      
      // انتخاب تصادفی تعداد خدمات، هتل‌ها و مدارک مورد نیاز
      const services = generateRandomServices();
      const hotels = generateRandomHotels();
      const requiredDocuments = generateRandomDocuments();
      
      // انتخاب تصادفی سیاست کنسلی
      const cancellationPolicy = generateRandomCancellationPolicy();
      
      // ساخت داده‌های تور
      const tourData: InsertTourData = {
        sourceId: source.id,
        title: `تور ${destination} - ${source.name}`,
        description: generateRandomDescription(destination),
        price: getRandomPrice(),
        duration: duration,
        imageUrl: `https://picsum.photos/800/500?random=${Math.floor(Math.random() * 1000)}`,
        originalUrl: `${source.url}/tour/${destination.toLowerCase().replace(' ', '-')}-${Math.floor(Math.random() * 1000)}`,
        destinationId: null,
        brandId: null,
        isPublished: true,
        metadata: null,
        services: services,
        hotels: hotels,
        requiredDocuments: requiredDocuments,
        cancellationPolicy: cancellationPolicy
      };
      
      // ذخیره اطلاعات تور
      await storage.createTourData(tourData);
    }

    // بروزرسانی زمان آخرین اسکرپ
    await storage.updateTourSourceLastScraped(source.id, new Date());

    // لاگ موفقیت
    await storage.createTourLog({
      level: "INFO",
      message: `اسکرپ منبع "${source.name}" با موفقیت انجام شد`,
      content: `تعداد تورهای استخراج شده: ${numberOfTours}`
    });

    return true;
  } catch (error: any) {
    // لاگ خطا
    await storage.createTourLog({
      level: "ERROR",
      message: `خطا در اسکرپ منبع "${source.name}"`,
      content: error.message
    });
    return false;
  }
}

// توابع کمکی برای تولید داده تستی
function getRandomDestination(): string {
  const destinations = [
    "کیش", "مشهد", "استانبول", "دبی", "آنتالیا", "تایلند", "مالزی", "باکو", "تفلیس", "ارمنستان",
    "گرجستان", "روسیه", "آذربایجان", "قطر", "عمان", "مالدیو", "سریلانکا", "هند"
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

function getRandomPrice(): string {
  const base = Math.floor(Math.random() * 15) + 5;
  const price = base * 1000000;
  return price.toLocaleString("fa-IR") + " تومان";
}

function generateRandomServices(): string[] {
  const allServices = [
    "پرواز رفت و برگشت", "اقامت در هتل", "ترانسفر فرودگاهی", "صبحانه بوفه", "گشت شهری",
    "راهنمای فارسی زبان", "بیمه مسافرتی", "ویزای تضمینی", "ترانسفر فرودگاهی VIP",
    "گشت شهری با نهار", "بلیط جاذبه‌های گردشگری", "سیم کارت رایگان", "تخفیف خرید",
    "وعده نهار", "وعده شام", "وای‌فای رایگان", "استقبال فرودگاهی", "استفاده از استخر هتل"
  ];
  
  // تعداد تصادفی خدمات (بین 5 تا 10)
  const numberOfServices = Math.floor(Math.random() * 6) + 5;
  
  // شافل کردن آرایه خدمات
  const shuffledServices = [...allServices].sort(() => 0.5 - Math.random());
  
  // انتخاب تعدادی از خدمات
  return shuffledServices.slice(0, numberOfServices);
}

function generateRandomHotels(): any[] {
  const hotelNames = [
    "هتل پارسیان", "هتل بزرگ", "هتل آسمان", "هتل ستاره", "هتل دریا", 
    "هتل آرامیس", "هتل الماس", "هتل پرشین", "هتل رویال", "هتل گلدن",
    "هتل صدف", "هتل آفتاب", "هتل پالاس", "هتل مجلل", "هتل لوکس"
  ];
  
  const ratings = ["عالی", "خیلی خوب", "خوب", "متوسط", "معمولی"];
  
  // تعداد تصادفی هتل‌ها (بین 2 تا 5)
  const numberOfHotels = Math.floor(Math.random() * 4) + 2;
  
  // شافل کردن آرایه هتل‌ها
  const shuffledHotels = [...hotelNames].sort(() => 0.5 - Math.random());
  
  // انتخاب تعدادی از هتل‌ها و ساخت آبجکت برای هر کدام
  const hotels = [];
  for (let i = 0; i < numberOfHotels; i++) {
    // قیمت پایه هتل بسته به امتیازش متفاوت است
    const stars = Math.floor(Math.random() * 3) + 3; // هتل بین 3 تا 5 ستاره
    const basePrice = (stars * 3 + Math.floor(Math.random() * 5)) * 1000000;
    
    hotels.push({
      name: shuffledHotels[i],
      imageUrl: `https://picsum.photos/500/300?random=${Math.floor(Math.random() * 1000)}`,
      rating: ratings[Math.floor(Math.random() * ratings.length)],
      stars: stars,
      price: basePrice.toLocaleString("fa-IR") + " تومان"
    });
  }
  
  // مرتب‌سازی هتل‌ها بر اساس تعداد ستاره (نزولی)
  return hotels.sort((a, b) => b.stars - a.stars);
}

function generateRandomDocuments(): string[] {
  const allDocuments = [
    "اصل پاسپورت با حداقل ۶ ماه اعتبار", "کپی شناسنامه و کارت ملی", "عکس ۶*۴ رنگی با زمینه سفید",
    "رزرو هتل و بلیط هواپیما", "گواهی تمکن مالی به زبان انگلیسی", "پرینت گردش ۳ ماهه حساب بانکی با مهر بانک",
    "بیمه مسافرتی", "فرم درخواست ویزا تکمیل شده", "گواهی اشتغال به کار به زبان انگلیسی",
    "ترجمه رسمی شناسنامه", "ترجمه رسمی سند ازدواج", "رضایت‌نامه محضری برای فرزندان زیر ۱۸ سال"
  ];
  
  // تعداد تصادفی مدارک (بین 3 تا 6)
  const numberOfDocuments = Math.floor(Math.random() * 4) + 3;
  
  // شافل کردن آرایه مدارک
  const shuffledDocuments = [...allDocuments].sort(() => 0.5 - Math.random());
  
  // انتخاب تعدادی از مدارک
  return shuffledDocuments.slice(0, numberOfDocuments);
}

function generateRandomCancellationPolicy(): string {
  const policies = [
    "کنسلی تا ۷۲ ساعت قبل از پرواز: ۲۰ درصد جریمه\nکنسلی تا ۴۸ ساعت قبل از پرواز: ۵۰ درصد جریمه\nکنسلی کمتر از ۲۴ ساعت: ۱۰۰ درصد جریمه",
    "کنسلی تا ۱۴ روز قبل از پرواز: بدون جریمه\nکنسلی تا ۷ روز قبل از پرواز: ۳۰ درصد جریمه\nکنسلی کمتر از ۳ روز: ۱۰۰ درصد جریمه",
    "کنسلی تا ۱۰ روز قبل از سفر: ۱۵ درصد جریمه\nکنسلی تا ۵ روز قبل از سفر: ۴۰ درصد جریمه\nکنسلی کمتر از ۴۸ ساعت: ۸۰ درصد جریمه",
    "در صورت کنسلی تا ۲۰ روز مانده به سفر: بدون جریمه\nاز ۲۰ تا ۱۰ روز مانده به سفر: ۲۵ درصد جریمه\nاز ۱۰ تا ۳ روز مانده به سفر: ۵۰ درصد جریمه\nکمتر از ۷۲ ساعت: کل مبلغ تور به عنوان جریمه محاسبه می‌شود"
  ];
  
  return policies[Math.floor(Math.random() * policies.length)];
}

function generateRandomDescription(destination: string): string {
  const descriptions = [
    `یک تور فوق‌العاده به ${destination} با امکانات ویژه و خدمات منحصر به فرد. این تور در بهترین هتل‌های مقصد با بهترین کیفیت برگزار می‌شود. با ما تجربه‌ای به یادماندنی از سفر به ${destination} خواهید داشت.`,
    `سفری خاطره‌انگیز به ${destination}، یکی از زیباترین مقاصد گردشگری. این تور با برنامه‌ریزی دقیق و همراهی راهنمایان مجرب برگزار می‌شود. از جاذبه‌های گردشگری ${destination} لذت ببرید.`,
    `با تور ${destination} ما، بهترین و مقرون به صرفه‌ترین سفر را تجربه کنید. از اقامت در هتل‌های لوکس تا بازدید از مناطق دیدنی شهر، همه چیز برای یک سفر فوق‌العاده مهیاست.`,
    `تجربه سفری بی‌نظیر به ${destination} با امکانات کامل و قیمت مناسب. این تور شامل اقامت در هتل‌های درجه یک، ترانسفر، راهنمای تور و بازدید از جاذبه‌های گردشگری است.`,
    `تعطیلات رویایی خود را در ${destination} سپری کنید. این تور با ارائه خدمات ویژه و قیمت مناسب، فرصتی استثنایی برای لذت بردن از جاذبه‌های ${destination} در اختیار شما قرار می‌دهد.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}