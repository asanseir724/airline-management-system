import axios from 'axios';
import { CheerioAPI, load } from 'cheerio';
import { storage } from '../storage';
import { InsertTourData, TourSource } from '@shared/schema';
import { throttle } from '../utils/throttle';

interface CrawlerOptions {
  maxDepth: number;
  maxPages: number;
  delay: number;
  timeout: number;
  followInternalLinks: boolean;
  userAgent: string;
}

interface QueueItem {
  url: string;
  depth: number;
  parentUrl: string | null;
}

interface VisitedPage {
  url: string;
  status: 'success' | 'failed';
  tourExtracted: boolean;
}

/**
 * کراولر پیشرفته برای استخراج اطلاعات تور
 * این کراولر قادر به پیمایش عمیق سایت‌ها، دنبال کردن لینک‌های داخلی
 * و استخراج اطلاعات از چندین صفحه است
 */
export class AdvancedCrawler {
  private queue: QueueItem[] = [];
  private visited: Map<string, VisitedPage> = new Map();
  private toursExtracted: number = 0;
  private source: TourSource;
  
  private options: CrawlerOptions = {
    maxDepth: 3,           // حداکثر عمق پیمایش
    maxPages: 50,          // حداکثر تعداد صفحات بررسی شده
    delay: 1000,           // تاخیر بین درخواست‌ها (میلی‌ثانیه)
    timeout: 30000,        // مهلت زمانی درخواست‌ها
    followInternalLinks: true, // دنبال کردن لینک‌های داخلی
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  // تابع گلوگاه برای کنترل نرخ درخواست‌ها
  private throttledRequest = throttle(axios.get, this.options.delay);
  
  /**
   * سازنده کلاس کراولر
   * @param source منبع تور
   * @param options تنظیمات کراولر
   */
  constructor(source: TourSource, options?: Partial<CrawlerOptions>) {
    this.source = source;
    
    if (options) {
      this.options = { ...this.options, ...options };
      // بروزرسانی تابع گلوگاه با تاخیر جدید
      this.throttledRequest = throttle(axios.get, this.options.delay);
    }
  }
  
  /**
   * شروع کراولینگ
   * @returns آیا عملیات موفقیت‌آمیز بود؟
   */
  public async crawl(): Promise<boolean> {
    try {
      // لاگ شروع کراولینگ
      await storage.createTourLog({
        level: "INFO",
        message: `شروع کراولینگ منبع "${this.source.name}"`,
        content: `URL: ${this.source.url}, عمق: ${this.options.maxDepth}, حداکثر صفحات: ${this.options.maxPages}`
      });
      
      // حذف داده‌های قبلی این منبع
      await storage.deleteTourDataBySourceId(this.source.id);
      
      // افزودن URL اولیه به صف
      this.addToQueue(this.source.url, 0, null);
      
      // شروع پردازش صف
      await this.processQueue();
      
      // بروزرسانی زمان آخرین اسکرپ
      await storage.updateTourSourceLastScraped(this.source.id, new Date());
      
      // لاگ موفقیت
      await storage.createTourLog({
        level: "INFO",
        message: `کراولینگ منبع "${this.source.name}" با موفقیت انجام شد`,
        content: `تعداد تورهای استخراج شده: ${this.toursExtracted}, صفحات بررسی شده: ${this.visited.size}`
      });
      
      return true;
    } catch (error: any) {
      // لاگ خطا
      await storage.createTourLog({
        level: "ERROR",
        message: `خطا در کراولینگ منبع "${this.source.name}"`,
        content: error.message
      });
      
      return false;
    }
  }
  
  /**
   * افزودن URL به صف
   * @param url آدرس صفحه
   * @param depth عمق پیمایش
   * @param parentUrl آدرس صفحه والد
   */
  private addToQueue(url: string, depth: number, parentUrl: string | null): void {
    // نرمال‌سازی URL
    const normalizedUrl = this.normalizeUrl(url, parentUrl);
    
    // اگر URL قبلاً بررسی شده یا در صف است، از افزودن خودداری کنیم
    if (this.visited.has(normalizedUrl) || this.queue.some(item => item.url === normalizedUrl)) {
      return;
    }
    
    // اگر عمق بیشتر از حداکثر عمق مجاز باشد، از افزودن خودداری کنیم
    if (depth > this.options.maxDepth) {
      return;
    }
    
    // اگر URL مربوط به منبع مورد نظر نیست، از افزودن خودداری کنیم
    if (!this.isInternalUrl(normalizedUrl)) {
      return;
    }
    
    // افزودن به صف
    this.queue.push({
      url: normalizedUrl,
      depth,
      parentUrl
    });
  }
  
  /**
   * پردازش صف
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.visited.size < this.options.maxPages) {
      const item = this.queue.shift();
      
      if (!item) continue;
      
      // اگر URL قبلاً بررسی شده، از پردازش خودداری کنیم
      if (this.visited.has(item.url)) {
        continue;
      }
      
      try {
        // ثبت لاگ پردازش URL
        console.log(`کراولینگ صفحه: ${item.url} (عمق: ${item.depth})`);
        
        // دریافت محتوای صفحه
        const response = await this.throttledRequest(item.url, {
          headers: {
            'User-Agent': this.options.userAgent
          },
          timeout: this.options.timeout
        });
        
        // بارگذاری محتوا با Cheerio
        const $ = load(response.data);
        
        // استخراج اطلاعات تور
        const tourExtracted = await this.extractTourData($, item.url);
        
        // ثبت صفحه بررسی شده
        this.visited.set(item.url, {
          url: item.url,
          status: 'success',
          tourExtracted
        });
        
        // اگر دنبال کردن لینک‌های داخلی فعال است
        if (this.options.followInternalLinks) {
          this.followLinks($, item.url, item.depth + 1);
        }
      } catch (error: any) {
        console.error(`خطا در بررسی ${item.url}:`, error.message);
        
        // ثبت صفحه با خطا
        this.visited.set(item.url, {
          url: item.url,
          status: 'failed',
          tourExtracted: false
        });
      }
      
      // ثبت پیشرفت در لاگ سیستم (هر 10 صفحه)
      if (this.visited.size % 10 === 0) {
        await storage.createTourLog({
          level: "INFO",
          message: `پیشرفت کراولینگ منبع "${this.source.name}"`,
          content: `صفحات بررسی شده: ${this.visited.size}, تورهای استخراج شده: ${this.toursExtracted}, در صف: ${this.queue.length}`
        });
      }
    }
  }
  
  /**
   * استخراج اطلاعات تور از صفحه
   * @param $ آبجکت Cheerio
   * @param url آدرس صفحه
   * @returns آیا تور از صفحه استخراج شد؟
   */
  private async extractTourData($: CheerioAPI, url: string): Promise<boolean> {
    try {
      // بررسی آیا این صفحه یک صفحه تور است
      if (!this.isTourPage($, url)) {
        return false;
      }
      
      // استخراج اطلاعات اصلی تور
      const title = this.extractTitle($);
      if (!title) {
        return false;
      }
      
      const description = this.extractDescription($);
      const price = this.extractPrice($);
      const duration = this.extractDuration($);
      const imageUrl = this.extractImageUrl($, url);
      
      // استخراج سایر اطلاعات
      const services = this.extractServices($);
      const hotels = this.extractHotels($);
      const requiredDocuments = this.extractRequiredDocuments($);
      const cancellationPolicy = this.extractCancellationPolicy($);
      
      // تشخیص نوع تور (داخلی یا خارجی)
      const isForeign = this.isForeignTour(title);
      
      // ساخت آبجکت تور
      const tourData: InsertTourData = {
        sourceId: this.source.id,
        title,
        description,
        price,
        duration,
        imageUrl,
        originalUrl: url,
        destinationId: null, // می‌توانیم با سیستم هوشمند مقصد را تشخیص دهیم
        brandId: null,
        isPublished: true,
        metadata: null,
        services,
        hotels,
        requiredDocuments,
        cancellationPolicy
      };
      
      // ذخیره اطلاعات تور
      await storage.createTourData(tourData);
      
      // افزایش شمارنده تورهای استخراج شده
      this.toursExtracted++;
      
      return true;
    } catch (error: any) {
      console.error(`خطا در استخراج اطلاعات تور از ${url}:`, error.message);
      return false;
    }
  }
  
  /**
   * بررسی آیا این صفحه یک صفحه تور است
   * @param $ آبجکت Cheerio
   * @param url آدرس صفحه
   * @returns آیا این صفحه یک صفحه تور است؟
   */
  private isTourPage($: CheerioAPI, url: string): boolean {
    // بررسی URL
    if (url.includes('/tour/') || url.includes('/tours/') || url.includes('product')) {
      return true;
    }
    
    // بررسی عنوان صفحه
    const pageTitle = $('title').text().toLowerCase();
    if (pageTitle.includes('تور ') || pageTitle.includes(' tour')) {
      return true;
    }
    
    // بررسی محتوای صفحه
    const bodyText = $('body').text().toLowerCase();
    const tourKeywords = ['خدمات تور', 'قیمت تور', 'مدت اقامت', 'هتل', 'بلیط هواپیما', 'ترانسفر'];
    const hasTourKeywords = tourKeywords.some(keyword => bodyText.includes(keyword));
    
    return hasTourKeywords;
  }
  
  /**
   * دنبال کردن لینک‌های داخلی
   * @param $ آبجکت Cheerio
   * @param baseUrl آدرس صفحه فعلی
   * @param depth عمق پیمایش جدید
   */
  private followLinks($: CheerioAPI, baseUrl: string, depth: number): void {
    // استخراج تمام لینک‌ها
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      
      if (!href) return;
      
      // افزودن به صف
      this.addToQueue(href, depth, baseUrl);
    });
  }
  
  /**
   * نرمال‌سازی URL
   * @param url آدرس خام
   * @param baseUrl آدرس پایه (اختیاری)
   * @returns آدرس نرمال‌شده
   */
  private normalizeUrl(url: string, baseUrl: string | null): string {
    try {
      // حذف پارامترهای جستجو و هش
      let cleanUrl = url.split('#')[0].split('?')[0];
      
      // حذف '/' اضافی در انتها
      cleanUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
      
      // اگر URL نسبی است، به URL مطلق تبدیل کنیم
      if (url.startsWith('/')) {
        const baseUrlObj = new URL(baseUrl || this.source.url);
        return `${baseUrlObj.protocol}//${baseUrlObj.host}${cleanUrl}`;
      }
      
      // اگر URL نسبی بدون '/' است
      if (!url.startsWith('http') && baseUrl) {
        const baseUrlWithoutFilename = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        return `${baseUrlWithoutFilename}${cleanUrl}`;
      }
      
      return cleanUrl;
    } catch (error) {
      // در صورت خطا در پردازش URL، همان URL اصلی را برگردانیم
      return url;
    }
  }
  
  /**
   * بررسی آیا URL داخلی است
   * @param url آدرس صفحه
   * @returns آیا URL داخلی است؟
   */
  private isInternalUrl(url: string): boolean {
    try {
      const sourceHost = new URL(this.source.url).host;
      const urlHost = new URL(url).host;
      
      return sourceHost === urlHost;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * تشخیص داخلی یا خارجی بودن تور بر اساس عنوان
   * @param title عنوان تور
   * @returns آیا تور خارجی است
   */
  private isForeignTour(title: string): boolean {
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
  
  // توابع استخراج اطلاعات تور
  
  /**
   * استخراج عنوان تور
   * @param $ آبجکت Cheerio
   * @returns عنوان تور
   */
  private extractTitle($: CheerioAPI): string {
    // روش‌های مختلف برای استخراج عنوان
    const methods = [
      () => $('h1').first().text().trim(),
      () => $('.tour-title').first().text().trim(),
      () => $('.product-title').first().text().trim(),
      () => $('title').text().replace(' | آژانس مسافرتی', '').replace(' | تور', '').trim(),
      () => $('.entry-title').first().text().trim()
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const title = method();
      if (title && title.length > 3) {
        return title;
      }
    }
    
    // اگر عنوان پیدا نشد
    return 'تور بدون عنوان';
  }
  
  /**
   * استخراج توضیحات تور
   * @param $ آبجکت Cheerio
   * @returns توضیحات تور
   */
  private extractDescription($: CheerioAPI): string {
    // روش‌های مختلف برای استخراج توضیحات
    const methods = [
      () => $('.tour-description').first().text().trim(),
      () => $('.product-description').first().text().trim(),
      () => $('.description').first().text().trim(),
      () => $('.content-area p').slice(0, 3).map((_, el) => $(el).text()).get().join(' '),
      () => $('meta[name="description"]').attr('content') || '',
      () => $('.entry-content p').slice(0, 3).map((_, el) => $(el).text()).get().join(' ')
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const description = method();
      if (description && description.length > 10) {
        return description;
      }
    }
    
    // اگر توضیحات پیدا نشد
    return 'اطلاعات بیشتر در سایت آژانس';
  }
  
  /**
   * استخراج قیمت تور
   * @param $ آبجکت Cheerio
   * @returns قیمت تور
   */
  private extractPrice($: CheerioAPI): string {
    // روش‌های مختلف برای استخراج قیمت
    const methods = [
      () => $('.tour-price').first().text().trim(),
      () => $('.price').first().text().trim(),
      () => $('.product-price').first().text().trim(),
      () => $('*:contains("قیمت")').filter(function() {
        return $(this).text().includes('تومان') || $(this).text().includes('ریال');
      }).first().text().trim()
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const price = method();
      if (price && (price.includes('تومان') || price.includes('ریال'))) {
        // پاکسازی قیمت
        return price.replace(/\s+/g, ' ').replace(/(\d+)[,\s]+(\d{3})/g, '$1,$2');
      }
    }
    
    // اگر قیمت پیدا نشد
    return 'قیمت متغیر';
  }
  
  /**
   * استخراج مدت زمان تور
   * @param $ آبجکت Cheerio
   * @returns مدت زمان تور
   */
  private extractDuration($: CheerioAPI): string {
    // روش‌های مختلف برای استخراج مدت زمان
    const methods = [
      () => $('.tour-duration').first().text().trim(),
      () => $('.duration').first().text().trim(),
      () => $('*:contains("مدت")').filter(function() {
        const text = $(this).text();
        return (text.includes('روز') || text.includes('شب')) && text.length < 50;
      }).first().text().trim(),
      () => {
        const text = $('body').text();
        const match = text.match(/(\d+)\s*(روز|شب)/);
        return match ? match[0] : '';
      }
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const duration = method();
      if (duration && (duration.includes('روز') || duration.includes('شب'))) {
        return duration;
      }
    }
    
    // اگر مدت زمان پیدا نشد
    return '';
  }
  
  /**
   * استخراج آدرس تصویر تور
   * @param $ آبجکت Cheerio
   * @param baseUrl آدرس صفحه
   * @returns آدرس تصویر تور
   */
  private extractImageUrl($: CheerioAPI, baseUrl: string): string {
    // روش‌های مختلف برای استخراج تصویر
    const methods = [
      () => $('.tour-image img').first().attr('src') || '',
      () => $('.product-image img').first().attr('src') || '',
      () => $('.gallery img').first().attr('src') || '',
      () => $('meta[property="og:image"]').attr('content') || '',
      () => $('.wp-post-image').first().attr('src') || '',
      () => $('.featured-image img').first().attr('src') || '',
      () => $('img').first().attr('src') || ''
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      let imageUrl = method();
      if (imageUrl) {
        // تبدیل URL نسبی به مطلق
        if (imageUrl.startsWith('/')) {
          const baseUrlObj = new URL(baseUrl);
          imageUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${imageUrl}`;
        } else if (!imageUrl.startsWith('http')) {
          const baseUrlWithoutFilename = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
          imageUrl = `${baseUrlWithoutFilename}${imageUrl}`;
        }
        
        return imageUrl;
      }
    }
    
    // اگر تصویر پیدا نشد
    return '';
  }
  
  /**
   * استخراج خدمات تور
   * @param $ آبجکت Cheerio
   * @returns لیست خدمات تور
   */
  private extractServices($: CheerioAPI): string[] {
    // روش‌های مختلف برای استخراج خدمات
    const methods = [
      () => $('.tour-services li').map((_, el) => $(el).text().trim()).get(),
      () => $('.services li').map((_, el) => $(el).text().trim()).get(),
      () => $('*:contains("خدمات تور")').next('ul').find('li').map((_, el) => $(el).text().trim()).get(),
      () => $('*:contains("خدمات شامل")').next('ul').find('li').map((_, el) => $(el).text().trim()).get(),
      () => {
        // پیدا کردن بخش‌های متنی که احتمالاً شامل خدمات هستند
        const serviceSection = $('*:contains("خدمات تور")').parents('div').first();
        return serviceSection.find('li').map((_, el) => $(el).text().trim()).get();
      }
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const services = method();
      if (services && services.length > 0) {
        // حذف موارد تکراری و خالی
        return [...new Set(services.filter(s => s.length > 0))];
      }
    }
    
    // خدمات پیش‌فرض
    return [
      'اقامت در هتل',
      'بیمه مسافرتی',
      'ترانسفر فرودگاهی',
      'راهنمای تور'
    ];
  }
  
  /**
   * استخراج هتل‌های تور
   * @param $ آبجکت Cheerio
   * @returns لیست هتل‌های تور
   */
  private extractHotels($: CheerioAPI): any[] {
    // روش‌های مختلف برای استخراج هتل‌ها
    let hotels: any[] = [];
    
    // روش 1: استفاده از ساختار مشخص هتل
    $('.hotel-item').each((_, el) => {
      const name = $(el).find('.hotel-name').text().trim();
      const stars = parseInt($(el).find('.hotel-stars').text()) || 4;
      const imageUrl = $(el).find('img').attr('src') || '';
      
      if (name) {
        hotels.push({
          name,
          stars,
          imageUrl,
          rating: 'خوب',
          price: 'قیمت متغیر'
        });
      }
    });
    
    if (hotels.length > 0) return hotels;
    
    // روش 2: جستجو برای هتل‌ها در عناصر لیستی
    const hotelLists = [
      $('*:contains("هتل‌ها")').next('ul').find('li'),
      $('*:contains("هتل ها")').next('ul').find('li'),
      $('*:contains("محل اقامت")').next('ul').find('li')
    ];
    
    for (const list of hotelLists) {
      if (list.length > 0) {
        hotels = list.map((_, el) => {
          const text = $(el).text().trim();
          const starsMatch = text.match(/(\d)\s*ستاره/);
          const stars = starsMatch ? parseInt(starsMatch[1]) : 4;
          
          return {
            name: text.replace(/\d\s*ستاره/, '').trim(),
            stars,
            imageUrl: '',
            rating: 'خوب',
            price: 'قیمت متغیر'
          };
        }).get();
        
        if (hotels.length > 0) return hotels;
      }
    }
    
    // روش 3: استخراج هتل از عنوان یا توضیحات
    const pageText = $('body').text();
    const hotelMatch = pageText.match(/هتل\s+([^\d\n,]+)/);
    
    if (hotelMatch) {
      return [{
        name: hotelMatch[1].trim(),
        stars: 4,
        imageUrl: '',
        rating: 'خوب',
        price: 'قیمت متغیر'
      }];
    }
    
    // استخراج نام هتل از عنوان صفحه
    const title = this.extractTitle($);
    const hotelInTitleMatch = title.match(/هتل\s+(.+?)(\s|$)/i);
    
    if (hotelInTitleMatch) {
      return [{
        name: hotelInTitleMatch[1].trim(),
        stars: 4,
        imageUrl: '',
        rating: 'خوب',
        price: 'قیمت متغیر'
      }];
    }
    
    // هتل پیش‌فرض
    return [{
      name: 'هتل منتخب تور',
      stars: 4,
      imageUrl: '',
      rating: 'خوب',
      price: 'قیمت متغیر'
    }];
  }
  
  /**
   * استخراج مدارک مورد نیاز تور
   * @param $ آبجکت Cheerio
   * @returns لیست مدارک مورد نیاز تور
   */
  private extractRequiredDocuments($: CheerioAPI): string[] {
    // روش‌های مختلف برای استخراج مدارک
    const methods = [
      () => $('.required-documents li').map((_, el) => $(el).text().trim()).get(),
      () => $('.documents li').map((_, el) => $(el).text().trim()).get(),
      () => $('*:contains("مدارک مورد نیاز")').next('ul').find('li').map((_, el) => $(el).text().trim()).get(),
      () => $('*:contains("مدارک لازم")').next('ul').find('li').map((_, el) => $(el).text().trim()).get()
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const documents = method();
      if (documents && documents.length > 0) {
        // حذف موارد تکراری و خالی
        return [...new Set(documents.filter(d => d.length > 0))];
      }
    }
    
    // بررسی آیا تور خارجی است
    const title = this.extractTitle($);
    const isForeign = this.isForeignTour(title);
    
    // مدارک پیش‌فرض
    if (isForeign) {
      return [
        'پاسپورت با حداقل 6 ماه اعتبار',
        'کارت ملی',
        'عکس 6*4 رنگی با زمینه سفید',
        'رزرو هتل و بلیط هواپیما'
      ];
    } else {
      return [
        'کارت ملی',
        'شناسنامه',
        'کارت بانکی'
      ];
    }
  }
  
  /**
   * استخراج سیاست کنسلی تور
   * @param $ آبجکت Cheerio
   * @returns سیاست کنسلی تور
   */
  private extractCancellationPolicy($: CheerioAPI): string {
    // روش‌های مختلف برای استخراج سیاست کنسلی
    const methods = [
      () => $('.cancellation-policy').text().trim(),
      () => $('*:contains("سیاست کنسلی")').parent().text().trim(),
      () => $('*:contains("قوانین کنسلی")').parent().text().trim(),
      () => $('*:contains("شرایط کنسلی")').parent().text().trim()
    ];
    
    // امتحان روش‌های مختلف
    for (const method of methods) {
      const policy = method();
      if (policy && policy.length > 20 && policy.includes('کنسل')) {
        // پاکسازی سیاست
        return policy.replace(/سیاست کنسلی|قوانین کنسلی|شرایط کنسلی/g, '').trim();
      }
    }
    
    // سیاست پیش‌فرض
    return `کنسلی تا ۷۲ ساعت قبل از پرواز: ۲۰ درصد جریمه
کنسلی تا ۴۸ ساعت قبل از پرواز: ۵۰ درصد جریمه
کنسلی کمتر از ۲۴ ساعت: ۱۰۰ درصد جریمه`;
  }
}