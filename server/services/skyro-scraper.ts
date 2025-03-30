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
      'دبی', 'استانبول', 'آنتالیا', 'کوش آداسی', 'ازمیر', 'کیش', 'ترکیه', 
      'قطر', 'مالزی', 'تایلند', 'بالی', 'سنگاپور', 'گرجستان', 'باکو', 
      'ارمنستان', 'ایروان', 'دهلی', 'بمبئی', 'روسیه', 'قبرس', 'وان',
      'آذربایجان', 'چین', 'پکن', 'شانگهای', 'پاتایا', 'پوکت', 'کوالالامپور'
    ];
    
    // بررسی وجود نام کشورهای خارجی در عنوان
    const title_lower = title.trim().toLowerCase();
    return foreignDestinations.some(destination => 
      title_lower.includes(destination.toLowerCase())
    );
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
      const title = $('.text-center > h1').text().trim();
      
      // تشخیص داخلی یا خارجی بودن تور بر اساس عنوان
      const isForeign = this.isForeignTour(title);
      
      // استخراج توضیحات
      const description = $('.fade-in-text').text().trim();
      
      // استخراج خدمات تور
      const services: string[] = [];
      $('.border-dashed li').each((index: number, element: cheerio.Element) => {
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
      
      $('.hotel-item').each((index: number, element: cheerio.Element) => {
        const hotelName = $(element).find('.hotel-name').text().trim();
        const hotelRating = $(element).find('.hotel-rating').text().trim();
        
        // استخراج تعداد ستاره‌ها
        let stars = 0;
        const starsText = $(element).find('.hotel-stars').text().trim();
        if (starsText.includes('⭐️')) {
          stars = starsText.split('⭐️').length - 1;
        } else {
          // تلاش برای تشخیص از متن
          if (starsText.includes('5')) stars = 5;
          else if (starsText.includes('4')) stars = 4;
          else if (starsText.includes('3')) stars = 3;
          else if (starsText.includes('2')) stars = 2;
          else if (starsText.includes('1')) stars = 1;
        }
        
        // استخراج قیمت
        const price = $(element).find('.hotel-price').text().trim();
        
        // استخراج تصویر
        const imageUrl = $(element).find('img').attr('src') || '';
        
        hotels.push({
          name: hotelName,
          rating: hotelRating,
          stars: stars,
          price: price,
          imageUrl: imageUrl
        });
      });
      
      // استخراج مدارک مورد نیاز
      const requiredDocuments: string[] = [];
      $('.required-documents li').each((index: number, element: cheerio.Element) => {
        const doc = $(element).text().trim();
        if (doc) requiredDocuments.push(doc);
      });
      
      // استخراج قوانین کنسلی
      const cancellationPolicyElement = $('.cancellation-policy');
      const cancellationPolicy = cancellationPolicyElement.length > 0 ? 
        cancellationPolicyElement.text().trim() : '';
      
      // تصویر تور
      const imageUrl = $('.tour-image img').attr('src') || '';
      
      // مدت زمان تور
      const duration = $('.tour-duration').text().trim();
      
      // قیمت تور
      const price = $('.tour-price').text().trim();
      
      // تهیه داده‌های نهایی
      const tourData = {
        title,
        description,
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