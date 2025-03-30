import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { TourData } from '@shared/schema';

/**
 * اسکریپر مخصوص برای سایت skyrotrip.com
 */
export class SkyroScraper {
  /**
   * تشخیص داخلی یا خارجی بودن تور بر اساس عنوان
   * @param title عنوان تور
   * @returns true اگر تور خارجی باشد
   */
  static isForeignTour(title: string): boolean {
    // لیست کشورهای خارجی که معمولاً در تورها استفاده می‌شوند
    const foreignDestinations = [
      'دبی', 'استانبول', 'آنتالیا', 'کوش آداسی', 'ازمیر', 'ترکیه', 
      'قطر', 'مالزی', 'تایلند', 'بالی', 'سنگاپور', 'گرجستان', 'باکو', 
      'ارمنستان', 'ایروان', 'دهلی', 'بمبئی', 'روسیه', 'قبرس', 'وان',
      'آذربایجان', 'چین', 'پکن', 'شانگهای', 'پاتایا', 'پوکت', 'کوالالامپور',
      'هند', 'امارات', 'ایتالیا', 'فرانسه', 'اسپانیا', 'آلمان', 'انگلیس'
    ];
    
    // کلمات کلیدی مرتبط با تورهای داخلی
    const domesticKeywords = [
      'کیش', 'مشهد', 'شیراز', 'اصفهان', 'تبریز', 'یزد', 'رشت', 'کرمان',
      'همدان', 'اهواز', 'کرمانشاه', 'بندرعباس', 'قشم', 'چابهار', 'لاهیجان'
    ];
    
    // بررسی وجود نام کشورهای خارجی در عنوان
    const title_lower = title.trim().toLowerCase();
    
    // اگر عنوان شامل هر یک از مقاصد داخلی است، قطعاً تور داخلی است
    if (domesticKeywords.some(destination => 
      title_lower.includes(destination.toLowerCase()))
    ) {
      return false;
    }
    
    // اگر عنوان شامل هر یک از مقاصد خارجی است، تور خارجی است
    return foreignDestinations.some(destination => 
      title_lower.includes(destination.toLowerCase())
    );
  }
  
  /**
   * استخراج تمام لینک‌های تور از صفحه اصلی سایت skyrotrip
   * @param url آدرس صفحه لیست تورها
   * @returns آرایه‌ای از لینک‌های تورها
   */
  static async extractTourLinks(url: string): Promise<string[]> {
    try {
      // درخواست صفحه لیست تورها
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`خطا در دریافت صفحه لیست تورها: ${response.status}`);
      }
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // آرایه لینک‌های تورها
      const tourLinks: string[] = [];
      
      // استخراج لینک‌های تور از صفحه
      // انتخابگر CSS باید متناسب با ساختار سایت اصلاح شود
      $('.package-card a, .tour-card a, .tour-item a').each((index, element) => {
        let href = $(element).attr('href');
        
        if (href) {
          // اگر لینک نسبی باشد آن را به لینک کامل تبدیل می‌کنیم
          if (!href.startsWith('http')) {
            // استخراج دامنه اصلی از URL ورودی
            const domain = new URL(url).origin;
            href = `${domain}${href.startsWith('/') ? '' : '/'}${href}`;
          }
          
          // افزودن لینک به آرایه اگر تکراری نباشد
          if (!tourLinks.includes(href)) {
            tourLinks.push(href);
          }
        }
      });
      
      return tourLinks;
      
    } catch (error) {
      console.error('خطا در استخراج لینک‌های تور:', error);
      return [];
    }
  }
  
  /**
   * استخراج اطلاعات تور از صفحه تور
   * @param url آدرس صفحه تور
   */
  static async scrapeTourPage(url: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
    isForeign?: boolean; // آیا تور خارجی است؟
  }> {
    try {
      // درخواست صفحه
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`خطا در دریافت صفحه: ${response.status}`);
      }
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // استخراج عنوان تور
      const title = $('.text-center > h1, .tour-title, .package-title').first().text().trim();
      
      // تشخیص داخلی یا خارجی بودن تور بر اساس عنوان
      const isForeign = this.isForeignTour(title);
      
      // استخراج توضیحات
      const description = $('.fade-in-text, .tour-description, .package-description').first().text().trim();
      
      // استخراج خدمات تور
      const services: string[] = [];
      $('.border-dashed li, .services-list li, .tour-services li').each((index, element) => {
        const service = $(element).text().trim();
        if (service) services.push(service);
      });
      
      // استخراج اطلاعات هتل‌ها
      const hotels: Array<{
        name: string;
        rating: string;
        stars: number;
        price: string;
        imageUrl: string;
      }> = [];
      
      $('.hotel-item, .tour-hotel, .hotel-card').each((index, element) => {
        const hotelName = $(element).find('.hotel-name, .hotel-title').first().text().trim();
        const hotelRating = $(element).find('.hotel-rating, .rating-text').first().text().trim() || 'خوب';
        
        // استخراج تعداد ستاره‌ها
        let stars = 0;
        const starsText = $(element).find('.hotel-stars, .star-rating').text().trim();
        
        if (starsText.includes('⭐️')) {
          stars = starsText.split('⭐️').length - 1;
        } else if (starsText.includes('★')) {
          stars = starsText.split('★').length - 1;
        } else {
          // تلاش برای تشخیص از متن
          if (starsText.includes('5')) stars = 5;
          else if (starsText.includes('4')) stars = 4;
          else if (starsText.includes('3')) stars = 3;
          else if (starsText.includes('2')) stars = 2;
          else if (starsText.includes('1')) stars = 1;
          // اگر نتوانستیم از متن تشخیص دهیم، از کلاس‌ها استفاده می‌کنیم
          else if ($(element).hasClass('five-star')) stars = 5;
          else if ($(element).hasClass('four-star')) stars = 4;
          else if ($(element).hasClass('three-star')) stars = 3;
          else if ($(element).hasClass('two-star')) stars = 2;
          else if ($(element).hasClass('one-star')) stars = 1;
          else stars = 4; // مقدار پیش‌فرض معقول
        }
        
        // استخراج قیمت
        const price = $(element).find('.hotel-price, .price-text').first().text().trim() || 'قیمت متغیر';
        
        // استخراج تصویر
        const imageUrl = $(element).find('img').attr('src') || '';
        
        hotels.push({
          name: hotelName || `هتل شماره ${index + 1}`,
          rating: hotelRating,
          stars: stars,
          price: price,
          imageUrl: imageUrl
        });
      });
      
      // استخراج مدارک مورد نیاز
      const requiredDocuments: string[] = [];
      $('.required-documents li, .documents-list li').each((index, element) => {
        const doc = $(element).text().trim();
        if (doc) requiredDocuments.push(doc);
      });
      
      // استخراج قوانین کنسلی
      const cancellationPolicyElement = $('.cancellation-policy, .cancel-rules');
      const cancellationPolicy = cancellationPolicyElement.length > 0 ? 
        cancellationPolicyElement.text().trim() : 'اطلاعات مربوط به قوانین کنسلی را از آژانس بپرسید.';
      
      // تصویر تور
      const imageUrl = $('.tour-image img, .package-image img, .main-image img').first().attr('src') || '';
      
      // مدت زمان تور
      const duration = $('.tour-duration, .package-duration, .duration-text').first().text().trim() || '3 روز';
      
      // قیمت تور
      const price = $('.tour-price, .package-price, .price-value').first().text().trim() || 'قیمت متغیر';
      
      // تهیه داده‌های نهایی
      const tourData = {
        title: title || 'تور بدون عنوان',
        description: description || 'بدون توضیحات',
        services,
        hotels,
        requiredDocuments,
        cancellationPolicy,
        imageUrl,
        duration,
        price,
        originalUrl: url
      };
      
      return {
        success: true,
        message: 'اطلاعات تور با موفقیت استخراج شد',
        data: tourData,
        isForeign
      };
      
    } catch (error) {
      console.error('خطا در اسکرپ تور skyrotrip:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در استخراج اطلاعات تور'
      };
    }
  }
  
  /**
   * اسکرپ چندین تور از یک آدرس
   * @param sourceUrl آدرس صفحه لیست تورها
   * @param sourceId آیدی منبع
   */
  static async scrapeMultipleTours(
    sourceUrl: string,
    sourceId: number
  ): Promise<{
    success: boolean;
    message: string;
    toursProcessed: number;
    toursAdded: number;
  }> {
    try {
      // استخراج لینک‌های تور
      const tourLinks = await this.extractTourLinks(sourceUrl);
      
      if (tourLinks.length === 0) {
        return {
          success: false,
          message: 'هیچ لینک توری در صفحه یافت نشد',
          toursProcessed: 0,
          toursAdded: 0
        };
      }
      
      // ثبت لاگ شروع استخراج
      await storage.createTourLog({
        level: 'INFO',
        message: `شروع استخراج ${tourLinks.length} تور از منبع skyrotrip.com`,
        content: `آدرس منبع: ${sourceUrl}`
      });
      
      // لیستی از تورهای افزوده شده
      let toursAdded = 0;
      
      // پردازش هر لینک
      for (let i = 0; i < tourLinks.length; i++) {
        const tourUrl = tourLinks[i];
        
        try {
          // اسکرپ اطلاعات تور
          const scrapeResult = await this.scrapeTourPage(tourUrl);
          
          if (!scrapeResult.success || !scrapeResult.data) {
            // ثبت لاگ اسکیپ
            await storage.createTourLog({
              level: 'WARNING',
              message: `اسکیپ تور شماره ${i + 1} به دلیل خطا در استخراج اطلاعات`,
              content: `آدرس: ${tourUrl} - خطا: ${scrapeResult.message}`
            });
            continue;
          }
          
          // تعیین نوع تور (داخلی یا خارجی)
          let finalSourceId = sourceId;
          
          // اگر کاربر منبع مشخصی را انتخاب نکرده و فقط از مقادیر پیش‌فرض استفاده کرده
          if (sourceId === 1 || sourceId === 2) {
            // اگر تشخیص دادیم که تور خارجی است
            if (scrapeResult.isForeign) {
              finalSourceId = 2; // تور خارجی
            } else {
              finalSourceId = 1; // تور داخلی
            }
          }
          
          // ایجاد تور جدید
          const newTour = await storage.createTourData({
            sourceId: finalSourceId,
            title: scrapeResult.data.title,
            description: scrapeResult.data.description,
            price: scrapeResult.data.price,
            duration: scrapeResult.data.duration,
            imageUrl: scrapeResult.data.imageUrl,
            originalUrl: tourUrl,
            destinationId: null, // می‌توان بعداً با استفاده از نام مقصد، مقصد مناسب را پیدا کرد
            brandId: null,
            isPublished: true,
            services: scrapeResult.data.services,
            hotels: scrapeResult.data.hotels,
            requiredDocuments: scrapeResult.data.requiredDocuments,
            cancellationPolicy: scrapeResult.data.cancellationPolicy,
          });
          
          // افزایش تعداد تورهای افزوده شده
          toursAdded++;
          
          // ثبت لاگ موفقیت
          await storage.createTourLog({
            level: 'INFO',
            message: `تور "${newTour.title}" (${i + 1}/${tourLinks.length}) با موفقیت ایجاد شد`,
            content: `آدرس: ${tourUrl}, نوع: ${scrapeResult.isForeign ? 'خارجی' : 'داخلی'}`
          });
          
          // صبر کوتاه برای جلوگیری از درخواست‌های متوالی سریع
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          // ثبت لاگ خطا برای این تور
          await storage.createTourLog({
            level: 'ERROR',
            message: `خطا در استخراج تور شماره ${i + 1}`,
            content: error instanceof Error ? error.message : 'خطای ناشناخته'
          });
        }
      }
      
      // بروزرسانی زمان آخرین اسکرپ منبع
      await storage.updateTourSourceLastScraped(sourceId, new Date());
      
      // ثبت لاگ اتمام استخراج
      await storage.createTourLog({
        level: 'INFO',
        message: `استخراج تورها از منبع skyrotrip.com به پایان رسید`,
        content: `تعداد تورهای پردازش شده: ${tourLinks.length}, تعداد تورهای افزوده شده: ${toursAdded}`
      });
      
      return {
        success: true,
        message: `${toursAdded} تور از ${tourLinks.length} تور با موفقیت استخراج شد`,
        toursProcessed: tourLinks.length,
        toursAdded: toursAdded
      };
      
    } catch (error) {
      console.error('خطا در استخراج چندگانه تور skyrotrip:', error);
      
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: 'ERROR',
        message: `خطا در استخراج چندگانه تور از سایت skyrotrip.com`,
        content: error instanceof Error ? error.message : 'خطای ناشناخته'
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در استخراج چندگانه تور',
        toursProcessed: 0,
        toursAdded: 0
      };
    }
  }
  
  /**
   * بروزرسانی اطلاعات تور بر اساس آیدی تور
   * @param tourId آیدی تور
   * @param tourUrl آدرس صفحه تور
   */
  static async updateTourData(tourId: number, tourUrl: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // ابتدا تور را پیدا می‌کنیم
      const tourData = await storage.getTourDataById(tourId);
      
      if (!tourData) {
        return {
          success: false,
          message: 'تور با آیدی مورد نظر یافت نشد'
        };
      }
      
      // اسکرپ اطلاعات جدید
      const scrapeResult = await this.scrapeTourPage(tourUrl);
      
      if (!scrapeResult.success || !scrapeResult.data) {
        return {
          success: false,
          message: scrapeResult.message
        };
      }
      
      // بروزرسانی اطلاعات تور
      const updatedTour = await storage.updateTourData(tourId, {
        title: scrapeResult.data.title || tourData.title,
        description: scrapeResult.data.description || tourData.description,
        price: scrapeResult.data.price || tourData.price,
        duration: scrapeResult.data.duration || tourData.duration,
        imageUrl: scrapeResult.data.imageUrl || tourData.imageUrl,
        originalUrl: tourUrl,
        services: scrapeResult.data.services || [],
        hotels: scrapeResult.data.hotels || [],
        requiredDocuments: scrapeResult.data.requiredDocuments || [],
        cancellationPolicy: scrapeResult.data.cancellationPolicy || null,
      });
      
      if (!updatedTour) {
        return {
          success: false,
          message: 'خطا در بروزرسانی اطلاعات تور'
        };
      }
      
      // ثبت لاگ
      await storage.createTourLog({
        level: 'INFO',
        message: `اطلاعات تور "${updatedTour.title}" از سایت skyrotrip.com با موفقیت بروزرسانی شد`,
        content: `آدرس: ${tourUrl}`
      });
      
      return {
        success: true,
        message: 'اطلاعات تور با موفقیت بروزرسانی شد'
      };
      
    } catch (error) {
      console.error('خطا در بروزرسانی اطلاعات تور skyrotrip:', error);
      
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: 'ERROR',
        message: `خطا در بروزرسانی اطلاعات تور از سایت skyrotrip.com`,
        content: error instanceof Error ? error.message : 'خطای ناشناخته'
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در بروزرسانی اطلاعات تور'
      };
    }
  }
  
  /**
   * ایجاد تور جدید از سایت skyrotrip
   * @param tourUrl آدرس صفحه تور
   * @param sourceId آیدی منبع
   * @param destinationId آیدی مقصد (اختیاری)
   * @param brandId آیدی برند (اختیاری)
   */
  static async createTourFromSkyroTrip(
    tourUrl: string,
    sourceId: number,
    destinationId?: number,
    brandId?: number
  ): Promise<{
    success: boolean;
    message: string;
    tourId?: number;
  }> {
    try {
      // اسکرپ اطلاعات تور
      const scrapeResult = await this.scrapeTourPage(tourUrl);
      
      if (!scrapeResult.success || !scrapeResult.data) {
        return {
          success: false,
          message: scrapeResult.message
        };
      }
      
      // بررسی نوع تور (داخلی یا خارجی)
      // اگر کاربر منبع را مشخص کرده باشد، از آن استفاده می‌کنیم
      // در غیر این صورت، از نتیجه تشخیص خودکار استفاده می‌کنیم
      let finalSourceId = sourceId;
      
      // اگر کاربر منبع مشخصی را انتخاب نکرده و فقط از مقادیر پیش‌فرض استفاده کرده
      if (sourceId === 1 || sourceId === 2) {
        // اگر تشخیص دادیم که تور خارجی است
        if (scrapeResult.isForeign) {
          finalSourceId = 2; // تور خارجی
        } else {
          finalSourceId = 1; // تور داخلی
        }
      }
      
      // ثبت لاگ تشخیص
      await storage.createTourLog({
        level: 'INFO',
        message: `تشخیص نوع تور: ${scrapeResult.isForeign ? 'خارجی' : 'داخلی'}`,
        content: `عنوان: ${scrapeResult.data.title}, منبع: ${finalSourceId}`
      });
      
      // ایجاد تور جدید
      const newTour = await storage.createTourData({
        sourceId: finalSourceId,
        title: scrapeResult.data.title,
        description: scrapeResult.data.description,
        price: scrapeResult.data.price,
        duration: scrapeResult.data.duration,
        imageUrl: scrapeResult.data.imageUrl,
        originalUrl: tourUrl,
        destinationId: destinationId,
        brandId: brandId,
        isPublished: true,
        services: scrapeResult.data.services,
        hotels: scrapeResult.data.hotels,
        requiredDocuments: scrapeResult.data.requiredDocuments,
        cancellationPolicy: scrapeResult.data.cancellationPolicy,
      });
      
      // ثبت لاگ
      await storage.createTourLog({
        level: 'INFO',
        message: `تور جدید "${newTour.title}" از سایت skyrotrip.com با موفقیت ایجاد شد`,
        content: `آدرس: ${tourUrl}`
      });
      
      return {
        success: true,
        message: 'تور جدید با موفقیت ایجاد شد',
        tourId: newTour.id
      };
      
    } catch (error) {
      console.error('خطا در ایجاد تور از skyrotrip:', error);
      
      // ثبت لاگ خطا
      await storage.createTourLog({
        level: 'ERROR',
        message: `خطا در ایجاد تور جدید از سایت skyrotrip.com`,
        content: error instanceof Error ? error.message : 'خطای ناشناخته'
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'خطای ناشناخته در ایجاد تور جدید'
      };
    }
  }
}