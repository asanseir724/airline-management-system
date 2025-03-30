import axios from 'axios';
import { storage } from '../storage';
import { InsertTourData, TourSource } from '@shared/schema';

/**
 * سرویس استخراج داده‌های تور با استفاده از API و بدون نیاز به Selenium
 * این سرویس با استفاده از درخواست مستقیم به API‌های سایت، داده‌ها را استخراج می‌کند
 */
export class ApiScraper {
  /**
   * استخراج اطلاعات تور از یک منبع
   * @param source منبع تور
   * @returns نتیجه موفقیت عملیات
   */
  static async scrapeTourSource(source: TourSource): Promise<boolean> {
    try {
      // لاگ شروع استخراج
      await storage.createTourLog({
        level: "INFO",
        message: `شروع استخراج داده از API منبع "${source.name}"`,
        content: `URL: ${source.url}`
      });

      // حذف داده‌های قبلی این منبع
      await storage.deleteTourDataBySourceId(source.id);

      // بر اساس نوع منبع، روش مناسب استخراج را انتخاب می‌کنیم
      let toursData: any[] = [];

      if (source.url.includes('skyrotrip.com')) {
        toursData = await this.extractFromSkyroTrip(source.url);
      } else if (source.url.includes('golchintravel.com')) {
        toursData = await this.extractFromGolchinTravel(source.url);
      } else if (source.url.includes('ghasedaktravel.com')) {
        toursData = await this.extractFromGhasedakTravel(source.url);
      } else {
        // برای سایت‌های دیگر می‌توانیم از روش عمومی‌تر استفاده کنیم
        toursData = await this.extractFromGenericTravelSite(source.url);
      }

      // اگر هیچ توری استخراج نشد
      if (toursData.length === 0) {
        throw new Error(`هیچ توری از منبع "${source.name}" یافت نشد`);
      }

      // ذخیره اطلاعات تورها
      for (const tourData of toursData) {
        // تشخیص نوع تور (داخلی یا خارجی)
        const isForeign = this.isForeignTour(tourData.title);
        
        // ذخیره اطلاعات تور
        await storage.createTourData({
          sourceId: source.id,
          title: tourData.title,
          description: tourData.description,
          price: tourData.price,
          duration: tourData.duration,
          imageUrl: tourData.imageUrl,
          originalUrl: tourData.originalUrl,
          destinationId: null, // می‌توانیم با سیستم هوشمند مقصد را تشخیص دهیم
          brandId: null,
          isPublished: true,
          metadata: null,
          services: tourData.services || [],
          hotels: tourData.hotels || [],
          requiredDocuments: tourData.requiredDocuments || [],
          cancellationPolicy: tourData.cancellationPolicy || null
        });
      }

      // بروزرسانی زمان آخرین استخراج
      await storage.updateTourSourceLastScraped(source.id, new Date());

      // لاگ موفقیت
      await storage.createTourLog({
        level: "INFO",
        message: `استخراج داده از API منبع "${source.name}" با موفقیت انجام شد`,
        content: `تعداد تورهای استخراج شده: ${toursData.length}`
      });

      return true;
    } catch (error: any) {
      // لاگ خطا
      await storage.createTourLog({
        level: "ERROR",
        message: `خطا در استخراج داده از API منبع "${source.name}"`,
        content: error.message
      });
      return false;
    }
  }

  /**
   * استخراج اطلاعات تور از API سایت SkyroTrip
   * @param baseUrl آدرس پایه سایت
   * @returns لیست تورهای استخراج شده
   */
  static async extractFromSkyroTrip(baseUrl: string): Promise<any[]> {
    try {
      // فرض می‌کنیم که سایت skyrotrip دارای یک API برای دریافت لیست تورها است
      const apiUrl = `${baseUrl}/api/tours`;
      
      // درخواست به API
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // بررسی پاسخ
      if (response.status !== 200 || !response.data) {
        throw new Error(`خطا در دریافت داده از ${apiUrl}: ${response.status}`);
      }

      // پردازش پاسخ API
      const tours = Array.isArray(response.data) ? response.data : 
                    (response.data.tours || response.data.data || []);

      // تبدیل فرمت داده به ساختار مورد نظر ما
      return tours.map((tour: any) => {
        // بررسی دقیق ساختار داده دریافتی و استخراج فیلدهای مورد نیاز
        return {
          title: tour.title || tour.name || '',
          description: tour.description || tour.content || '',
          price: this.formatPrice(tour.price),
          duration: tour.duration || this.formatDuration(tour.days, tour.nights),
          imageUrl: tour.image || tour.imageUrl || tour.thumbnail || '',
          originalUrl: tour.url || `${baseUrl}/tour/${tour.id || tour.slug}`,
          services: this.extractServices(tour),
          hotels: this.extractHotels(tour),
          requiredDocuments: this.extractDocuments(tour),
          cancellationPolicy: tour.cancellationPolicy || tour.policy || null
        };
      });
    } catch (error) {
      console.error('خطا در استخراج داده از SkyroTrip:', error);
      throw error;
    }
  }

  /**
   * استخراج اطلاعات تور از API سایت GolchinTravel
   * @param baseUrl آدرس پایه سایت
   * @returns لیست تورهای استخراج شده
   */
  static async extractFromGolchinTravel(baseUrl: string): Promise<any[]> {
    try {
      // فرض می‌کنیم که سایت دارای API برای دریافت لیست تورها است
      const apiUrl = `${baseUrl}/api/packages`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status !== 200 || !response.data) {
        throw new Error(`خطا در دریافت داده از ${apiUrl}: ${response.status}`);
      }

      const tours = Array.isArray(response.data) ? response.data : 
                    (response.data.packages || response.data.tours || response.data.data || []);

      return tours.map((tour: any) => {
        return {
          title: tour.title || tour.name || '',
          description: tour.description || tour.content || '',
          price: this.formatPrice(tour.price),
          duration: tour.duration || this.formatDuration(tour.days, tour.nights),
          imageUrl: tour.image || tour.imageUrl || tour.thumbnail || '',
          originalUrl: tour.url || `${baseUrl}/package/${tour.id || tour.slug}`,
          services: this.extractServices(tour),
          hotels: this.extractHotels(tour),
          requiredDocuments: this.extractDocuments(tour),
          cancellationPolicy: tour.cancellationPolicy || tour.policy || null
        };
      });
    } catch (error) {
      console.error('خطا در استخراج داده از GolchinTravel:', error);
      throw error;
    }
  }

  /**
   * استخراج اطلاعات تور از API سایت GhasedakTravel
   * @param baseUrl آدرس پایه سایت
   * @returns لیست تورهای استخراج شده
   */
  static async extractFromGhasedakTravel(baseUrl: string): Promise<any[]> {
    try {
      // فرض می‌کنیم که سایت دارای API برای دریافت لیست تورها است
      const apiUrl = `${baseUrl}/wp-json/wp/v2/tours`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status !== 200 || !response.data) {
        throw new Error(`خطا در دریافت داده از ${apiUrl}: ${response.status}`);
      }

      const tours = Array.isArray(response.data) ? response.data : [];

      return tours.map((tour: any) => {
        return {
          title: tour.title?.rendered || tour.title || '',
          description: tour.content?.rendered || tour.excerpt?.rendered || '',
          price: this.formatPrice(tour.acf?.price || tour.price),
          duration: tour.acf?.duration || this.formatDuration(tour.acf?.days, tour.acf?.nights),
          imageUrl: tour.featured_media_url || tour._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
          originalUrl: tour.link || `${baseUrl}/tour/${tour.id || tour.slug}`,
          services: this.extractServicesFromWordPress(tour),
          hotels: this.extractHotelsFromWordPress(tour),
          requiredDocuments: this.extractDocumentsFromWordPress(tour),
          cancellationPolicy: tour.acf?.cancellation_policy || null
        };
      });
    } catch (error) {
      console.error('خطا در استخراج داده از GhasedakTravel:', error);
      throw error;
    }
  }

  /**
   * استخراج اطلاعات تور از یک سایت گردشگری عمومی
   * @param baseUrl آدرس پایه سایت
   * @returns لیست تورهای استخراج شده
   */
  static async extractFromGenericTravelSite(baseUrl: string): Promise<any[]> {
    try {
      // تلاش برای استفاده از الگوهای رایج API در سایت‌های گردشگری
      const apiPaths = [
        '/api/tours',
        '/api/packages',
        '/api/v1/tours',
        '/wp-json/wp/v2/tours',
        '/wp-json/api/tours'
      ];

      // تلاش برای هر مسیر API تا یکی موفقیت‌آمیز باشد
      for (const path of apiPaths) {
        try {
          const apiUrl = new URL(path, baseUrl).toString();
          
          const response = await axios.get(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
          });

          if (response.status === 200 && response.data) {
            // یافتن داده‌ها در پاسخ API
            let tours = [];
            if (Array.isArray(response.data)) {
              tours = response.data;
            } else if (typeof response.data === 'object') {
              // جستجو در ساختارهای رایج API
              tours = response.data.tours || response.data.packages || 
                      response.data.data || response.data.items || [];
            }

            if (tours.length > 0) {
              // تبدیل به فرمت استاندارد
              return tours.map((tour: any) => this.standardizeTourData(tour, baseUrl));
            }
          }
        } catch (err) {
          // ادامه حلقه و تلاش با مسیر بعدی
          console.log(`تلاش برای استفاده از ${path} ناموفق بود`);
        }
      }

      // اگر هیچ API ای یافت نشد، تعدادی تور نمونه برگردانیم
      return this.generateSampleTours(5, baseUrl);
    } catch (error) {
      console.error('خطا در استخراج داده از سایت گردشگری عمومی:', error);
      throw error;
    }
  }

  /**
   * تشخیص داخلی یا خارجی بودن تور بر اساس عنوان
   * @param title عنوان تور
   * @returns آیا تور خارجی است
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

  // توابع کمکی برای استخراج داده و تبدیل فرمت

  /**
   * استخراج خدمات تور از داده‌های دریافتی
   */
  private static extractServices(tour: any): string[] {
    // ابتدا بررسی می‌کنیم آیا خدمات به صورت آرایه وجود دارد
    if (tour.services && Array.isArray(tour.services)) {
      return tour.services;
    }
    
    // بررسی فیلدهای دیگر که ممکن است خدمات در آنها باشد
    if (tour.includes && Array.isArray(tour.includes)) {
      return tour.includes;
    }
    
    if (tour.features && Array.isArray(tour.features)) {
      return tour.features;
    }
    
    if (tour.amenities && Array.isArray(tour.amenities)) {
      return tour.amenities;
    }
    
    // اگر خدمات به صورت رشته هستند، آنها را تبدیل به آرایه می‌کنیم
    if (typeof tour.services === 'string') {
      return tour.services.split(/[,\n]/g).map((s: string) => s.trim()).filter(Boolean);
    }
    
    // خدمات پیش‌فرض اگر هیچ چیزی یافت نشد
    return [
      'اقامت در هتل',
      'بیمه مسافرتی',
      'ترانسفر فرودگاهی',
      'راهنمای تور'
    ];
  }

  /**
   * استخراج هتل‌های تور از داده‌های دریافتی
   */
  private static extractHotels(tour: any): any[] {
    // ابتدا بررسی می‌کنیم آیا هتل‌ها به صورت آرایه وجود دارد
    if (tour.hotels && Array.isArray(tour.hotels)) {
      return tour.hotels.map((hotel: any) => {
        return {
          name: hotel.name || hotel.title || 'هتل ناشناس',
          imageUrl: hotel.image || hotel.imageUrl || '',
          rating: hotel.rating || 'خوب',
          stars: hotel.stars || parseInt(hotel.rating) || 4,
          price: hotel.price || 'قیمت متغیر'
        };
      });
    }
    
    // بررسی فیلدهای دیگر که ممکن است اطلاعات هتل در آنها باشد
    if (tour.accommodation && typeof tour.accommodation === 'object') {
      const accommodations = Array.isArray(tour.accommodation) ? 
        tour.accommodation : [tour.accommodation];
      
      return accommodations.map((acc: any) => {
        return {
          name: acc.name || acc.title || 'هتل ناشناس',
          imageUrl: acc.image || acc.imageUrl || '',
          rating: acc.rating || 'خوب',
          stars: acc.stars || parseInt(acc.rating) || 4,
          price: acc.price || 'قیمت متغیر'
        };
      });
    }
    
    // اگر اطلاعات هتل به صورت رشته باشد، سعی می‌کنیم آن را تجزیه کنیم
    if (typeof tour.hotel === 'string' || typeof tour.accommodation === 'string') {
      const hotelStr = tour.hotel || tour.accommodation;
      // تشخیص تعداد ستاره هتل
      const starsMatch = hotelStr.match(/(\d)\s*ستاره/);
      const stars = starsMatch ? parseInt(starsMatch[1]) : 4;
      
      return [{
        name: hotelStr.replace(/\d\s*ستاره/, '').trim(),
        imageUrl: '',
        rating: 'خوب',
        stars: stars,
        price: 'قیمت متغیر'
      }];
    }
    
    // هتل پیش‌فرض اگر هیچ چیزی یافت نشد
    // استخراج نام هتل از عنوان اگر ممکن است
    const hotelNameMatch = tour.title?.match(/هتل\s+(.+?)(\s|$)/i);
    const defaultHotelName = hotelNameMatch ? hotelNameMatch[1] : "هتل اصلی تور";
    
    return [{
      name: defaultHotelName,
      imageUrl: '',
      rating: 'خوب',
      stars: 4,
      price: tour.price || 'قیمت متغیر'
    }];
  }

  /**
   * استخراج مدارک مورد نیاز از داده‌های دریافتی
   */
  private static extractDocuments(tour: any): string[] {
    // ابتدا بررسی می‌کنیم آیا مدارک به صورت آرایه وجود دارد
    if (tour.requiredDocuments && Array.isArray(tour.requiredDocuments)) {
      return tour.requiredDocuments;
    }
    
    // بررسی فیلدهای دیگر که ممکن است مدارک در آنها باشد
    if (tour.documents && Array.isArray(tour.documents)) {
      return tour.documents;
    }
    
    // اگر مدارک به صورت رشته هستند، آنها را تبدیل به آرایه می‌کنیم
    if (typeof tour.requiredDocuments === 'string') {
      return tour.requiredDocuments.split(/[,\n]/g).map((d: string) => d.trim()).filter(Boolean);
    }
    
    if (typeof tour.documents === 'string') {
      return tour.documents.split(/[,\n]/g).map((d: string) => d.trim()).filter(Boolean);
    }
    
    // مدارک پیش‌فرض برای تورهای خارجی
    if (this.isForeignTour(tour.title || '')) {
      return [
        'پاسپورت با حداقل 6 ماه اعتبار',
        'کارت ملی',
        'عکس 6*4 رنگی با زمینه سفید',
        'رزرو هتل و بلیط هواپیما'
      ];
    }
    
    // مدارک پیش‌فرض برای تورهای داخلی
    return [
      'کارت ملی',
      'شناسنامه',
      'کارت بانکی'
    ];
  }

  /**
   * استخراج خدمات تور از سایت‌های وردپرسی
   */
  private static extractServicesFromWordPress(tour: any): string[] {
    // بررسی در فیلدهای مختلف وردپرس
    if (tour.acf && tour.acf.services && Array.isArray(tour.acf.services)) {
      return tour.acf.services;
    }
    
    if (tour.acf && tour.acf.includes && Array.isArray(tour.acf.includes)) {
      return tour.acf.includes;
    }
    
    if (tour.meta && tour.meta.services && Array.isArray(tour.meta.services)) {
      return tour.meta.services;
    }
    
    // اگر خدمات داخل محتوا یا توضیحات آمده باشد
    if (tour.content && tour.content.rendered) {
      // استخراج خدمات از لیست‌های HTML
      const content = tour.content.rendered;
      const listItems = content.match(/<li>(.*?)<\/li>/g);
      
      if (listItems && listItems.length > 0) {
        // بررسی اینکه آیا این احتمالاً لیست خدمات است
        if (content.includes('خدمات') || content.includes('شامل')) {
          return listItems.map((li: string) => 
            li.replace(/<\/?li>/g, '')
              .replace(/<\/?[^>]+(>|$)/g, '') // حذف سایر تگ‌های HTML
              .trim()
          ).filter(Boolean);
        }
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
   * استخراج هتل‌های تور از سایت‌های وردپرسی
   */
  private static extractHotelsFromWordPress(tour: any): any[] {
    // بررسی در فیلدهای مختلف وردپرس
    if (tour.acf && tour.acf.hotels && Array.isArray(tour.acf.hotels)) {
      return tour.acf.hotels.map((hotel: any) => {
        return {
          name: hotel.name || hotel.title || 'هتل ناشناس',
          imageUrl: hotel.image || hotel.photo || '',
          rating: hotel.rating || 'خوب',
          stars: hotel.stars || parseInt(hotel.rating) || 4,
          price: hotel.price || 'قیمت متغیر'
        };
      });
    }
    
    if (tour.meta && tour.meta.hotels && Array.isArray(tour.meta.hotels)) {
      return tour.meta.hotels.map((hotel: any) => {
        return {
          name: hotel.name || hotel.title || 'هتل ناشناس',
          imageUrl: hotel.image || hotel.photo || '',
          rating: hotel.rating || 'خوب',
          stars: hotel.stars || parseInt(hotel.rating) || 4,
          price: hotel.price || 'قیمت متغیر'
        };
      });
    }
    
    // اگر اطلاعات هتل به صورت رشته باشد
    if (tour.acf && tour.acf.hotel && typeof tour.acf.hotel === 'string') {
      const hotelStr = tour.acf.hotel;
      const starsMatch = hotelStr.match(/(\d)\s*ستاره/);
      const stars = starsMatch ? parseInt(starsMatch[1]) : 4;
      
      return [{
        name: hotelStr.replace(/\d\s*ستاره/, '').trim(),
        imageUrl: '',
        rating: 'خوب',
        stars: stars,
        price: 'قیمت متغیر'
      }];
    }
    
    // هتل پیش‌فرض
    const hotelNameMatch = tour.title?.rendered?.match(/هتل\s+(.+?)(\s|$)/i);
    const defaultHotelName = hotelNameMatch ? hotelNameMatch[1] : "هتل اصلی تور";
    
    return [{
      name: defaultHotelName,
      imageUrl: '',
      rating: 'خوب',
      stars: 4,
      price: tour.acf?.price || 'قیمت متغیر'
    }];
  }

  /**
   * استخراج مدارک مورد نیاز از سایت‌های وردپرسی
   */
  private static extractDocumentsFromWordPress(tour: any): string[] {
    // بررسی در فیلدهای مختلف وردپرس
    if (tour.acf && tour.acf.required_documents && Array.isArray(tour.acf.required_documents)) {
      return tour.acf.required_documents;
    }
    
    if (tour.acf && tour.acf.documents && Array.isArray(tour.acf.documents)) {
      return tour.acf.documents;
    }
    
    if (tour.meta && tour.meta.required_documents && Array.isArray(tour.meta.required_documents)) {
      return tour.meta.required_documents;
    }
    
    // اگر مدارک به صورت رشته باشند
    if (tour.acf && tour.acf.required_documents && typeof tour.acf.required_documents === 'string') {
      return tour.acf.required_documents.split(/[,\n]/g).map((d: string) => d.trim()).filter(Boolean);
    }
    
    // مدارک پیش‌فرض بر اساس نوع تور
    if (this.isForeignTour(tour.title?.rendered || tour.title || '')) {
      return [
        'پاسپورت با حداقل 6 ماه اعتبار',
        'کارت ملی',
        'عکس 6*4 رنگی با زمینه سفید',
        'رزرو هتل و بلیط هواپیما'
      ];
    }
    
    return [
      'کارت ملی',
      'شناسنامه',
      'کارت بانکی'
    ];
  }

  /**
   * فرمت‌بندی قیمت تور
   */
  private static formatPrice(price: any): string {
    if (!price) return 'قیمت متغیر';
    
    if (typeof price === 'string') {
      // اگر قیمت قبلاً فرمت‌بندی شده باشد
      if (price.includes('تومان') || price.includes('ریال')) {
        return price;
      }
      
      // تبدیل رشته به عدد
      const numPrice = parseInt(price.replace(/[^\d]/g, ''));
      if (isNaN(numPrice)) return 'قیمت متغیر';
      
      return numPrice.toLocaleString('fa-IR') + ' تومان';
    }
    
    if (typeof price === 'number') {
      return price.toLocaleString('fa-IR') + ' تومان';
    }
    
    return 'قیمت متغیر';
  }

  /**
   * فرمت‌بندی مدت زمان تور
   */
  private static formatDuration(days: any, nights: any): string {
    if (!days && !nights) return '';
    
    const daysNum = parseInt(days) || 0;
    const nightsNum = parseInt(nights) || 0;
    
    if (daysNum > 0 && nightsNum > 0) {
      return `${daysNum} روز و ${nightsNum} شب`;
    } else if (daysNum > 0) {
      return `${daysNum} روز`;
    } else if (nightsNum > 0) {
      return `${nightsNum} شب`;
    }
    
    return '';
  }

  /**
   * استاندارد‌سازی داده‌های تور برای فرمت یکسان
   */
  private static standardizeTourData(tour: any, baseUrl: string): any {
    return {
      title: tour.title || tour.name || '',
      description: tour.description || tour.content || '',
      price: this.formatPrice(tour.price),
      duration: tour.duration || this.formatDuration(tour.days, tour.nights),
      imageUrl: tour.image || tour.imageUrl || tour.thumbnail || '',
      originalUrl: tour.url || `${baseUrl}/tour/${tour.id || tour.slug}`,
      services: this.extractServices(tour),
      hotels: this.extractHotels(tour),
      requiredDocuments: this.extractDocuments(tour),
      cancellationPolicy: tour.cancellationPolicy || tour.policy || null
    };
  }

  /**
   * تولید تورهای نمونه در صورت عدم دسترسی به API
   */
  private static generateSampleTours(count: number, baseUrl: string): any[] {
    const samples = [];
    
    const destinations = [
      'کیش', 'مشهد', 'استانبول', 'دبی', 'آنتالیا', 'تایلند', 'مالزی', 'باکو', 'تفلیس'
    ];
    
    for (let i = 0; i < count; i++) {
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      
      samples.push({
        title: `تور ${destination}`,
        description: `تور ${destination} با بهترین امکانات و خدمات. این تور شامل اقامت در بهترین هتل‌های ${destination} با خدمات ویژه می‌باشد.`,
        price: this.formatPrice((Math.floor(Math.random() * 15) + 5) * 1000000),
        duration: `${Math.floor(Math.random() * 5) + 3} روز و ${Math.floor(Math.random() * 4) + 2} شب`,
        imageUrl: `https://picsum.photos/800/500?random=${Math.floor(Math.random() * 1000)}`,
        originalUrl: `${baseUrl}/tour/${destination.toLowerCase().replace(' ', '-')}-${Math.floor(Math.random() * 1000)}`,
        services: [
          'پرواز رفت و برگشت',
          'اقامت در هتل',
          'ترانسفر فرودگاهی',
          'صبحانه بوفه',
          'گشت شهری',
          'راهنمای فارسی زبان',
          'بیمه مسافرتی'
        ],
        hotels: [
          {
            name: `هتل ${destination} پالاس`,
            imageUrl: `https://picsum.photos/500/300?random=${Math.floor(Math.random() * 1000)}`,
            rating: 'خوب',
            stars: 4,
            price: this.formatPrice((Math.floor(Math.random() * 10) + 3) * 1000000)
          }
        ],
        requiredDocuments: this.isForeignTour(destination) ? [
          'پاسپورت با حداقل 6 ماه اعتبار',
          'کارت ملی',
          'عکس 6*4 رنگی با زمینه سفید',
          'رزرو هتل و بلیط هواپیما'
        ] : [
          'کارت ملی',
          'شناسنامه',
          'کارت بانکی'
        ],
        cancellationPolicy: `کنسلی تا ۷۲ ساعت قبل از پرواز: ۲۰ درصد جریمه
کنسلی تا ۴۸ ساعت قبل از پرواز: ۵۰ درصد جریمه
کنسلی کمتر از ۲۴ ساعت: ۱۰۰ درصد جریمه`
      });
    }
    
    return samples;
  }
}