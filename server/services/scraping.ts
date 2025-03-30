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

    // ایجاد دو نمونه تور با داده‌های تستی
    const tourData1: InsertTourData = {
      sourceId: source.id,
      title: `تور ${getRandomDestination()} - ${source.name}`,
      description: "یک تور فوق‌العاده با امکانات ویژه و خدمات منحصر به فرد. این تور در بهترین هتل‌های مقصد با بهترین کیفیت برگزار می‌شود.",
      price: getRandomPrice(),
      duration: `${Math.floor(Math.random() * 10) + 2} روز`,
      imageUrl: "https://picsum.photos/800/500",
      originalUrl: source.url,
      destinationId: null,
      brandId: null,
      isPublished: true,
      metadata: null,
      services: [
        "پرواز رفت و برگشت",
        "اقامت در هتل",
        "ترانسفر فرودگاهی",
        "صبحانه بوفه",
        "گشت شهری",
        "راهنمای فارسی زبان",
        "بیمه مسافرتی"
      ],
      hotels: [
        {
          name: "هتل پارسیان",
          imageUrl: "https://picsum.photos/500/300",
          rating: "عالی",
          stars: 5,
          price: "۱۴,۵۰۰,۰۰۰ تومان"
        },
        {
          name: "هتل آسمان",
          imageUrl: "https://picsum.photos/500/300",
          rating: "خوب",
          stars: 4,
          price: "۱۲,۳۰۰,۰۰۰ تومان"
        },
        {
          name: "هتل ستاره",
          imageUrl: "https://picsum.photos/500/300",
          rating: "متوسط",
          stars: 3,
          price: "۸,۹۰۰,۰۰۰ تومان"
        }
      ],
      requiredDocuments: [
        "اصل پاسپورت با حداقل ۶ ماه اعتبار",
        "کپی شناسنامه و کارت ملی",
        "عکس ۶*۴ رنگی با زمینه سفید",
        "رزرو هتل و بلیط هواپیما"
      ],
      cancellationPolicy: "کنسلی تا ۷۲ ساعت قبل از پرواز: ۲۰ درصد جریمه\nکنسلی تا ۴۸ ساعت قبل از پرواز: ۵۰ درصد جریمه\nکنسلی کمتر از ۲۴ ساعت: ۱۰۰ درصد جریمه"
    };

    const tourData2: InsertTourData = {
      sourceId: source.id,
      title: `تور ${getRandomDestination()} - ${source.name}`,
      description: "یک سفر خاطره‌انگیز به یکی از زیباترین مقاصد گردشگری. این تور با برنامه‌ریزی دقیق و همراهی راهنمایان مجرب برگزار می‌شود.",
      price: getRandomPrice(),
      duration: `${Math.floor(Math.random() * 10) + 2} روز`,
      imageUrl: "https://picsum.photos/800/500",
      originalUrl: source.url,
      destinationId: null,
      brandId: null,
      isPublished: true,
      metadata: null,
      services: [
        "پرواز چارتر اختصاصی",
        "اقامت در هتل با صبحانه",
        "ترانسفر فرودگاهی VIP",
        "گشت شهری با نهار",
        "راهنمای مجرب فارسی زبان",
        "بیمه مسافرتی",
        "ویزای تضمینی"
      ],
      hotels: [
        {
          name: "هتل بزرگ",
          imageUrl: "https://picsum.photos/500/300",
          rating: "عالی",
          stars: 5,
          price: "۱۸,۹۰۰,۰۰۰ تومان"
        },
        {
          name: "هتل دریا",
          imageUrl: "https://picsum.photos/500/300",
          rating: "خیلی خوب",
          stars: 4,
          price: "۱۵,۵۰۰,۰۰۰ تومان"
        }
      ],
      requiredDocuments: [
        "اصل پاسپورت با حداقل ۷ ماه اعتبار",
        "دو قطعه عکس ۶*۴ رنگی با زمینه سفید",
        "کپی شناسنامه و کارت ملی",
        "پرینت گردش ۳ ماهه حساب بانکی با مهر بانک",
        "گواهی تمکن مالی به زبان انگلیسی"
      ],
      cancellationPolicy: "کنسلی تا ۱۴ روز قبل از پرواز: بدون جریمه\nکنسلی تا ۷ روز قبل از پرواز: ۳۰ درصد جریمه\nکنسلی کمتر از ۳ روز: ۱۰۰ درصد جریمه"
    };

    // ذخیره اطلاعات تور
    await storage.createTourData(tourData1);
    await storage.createTourData(tourData2);

    // بروزرسانی زمان آخرین اسکرپ
    await storage.updateTourSourceLastScraped(source.id, new Date());

    // لاگ موفقیت
    await storage.createTourLog({
      level: "INFO",
      message: `اسکرپ منبع "${source.name}" با موفقیت انجام شد`,
      content: `تعداد تورهای استخراج شده: 2`
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
    "کیش", "مشهد", "استانبول", "دبی", "آنتالیا", "تایلند", "مالزی", "باکو", "تفلیس", "ارمنستان"
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

function getRandomPrice(): string {
  const base = Math.floor(Math.random() * 15) + 5;
  const price = base * 1000000;
  return price.toLocaleString("fa-IR") + " تومان";
}