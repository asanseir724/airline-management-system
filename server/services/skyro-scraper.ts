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
      
      // انتخابگرهای مختلف برای یافتن لینک‌های تورها
      const selectors = [
        '.package-card a[href*="/tours/"]', 
        '.tour-card a[href*="/tours/"]', 
        '.tour-item a[href*="/tours/"]',
        'a.tour-link',
        '.tour-packages a',
        '.main-content a[href*="tour"]',
        '.card-container a[href*="tour"]',
        // سلکتورهای خاص skyrotrip
        '.tour-item-card a',
        '.tour-grid a',
        '.tour-listing a'
      ];
      
      // استفاده از تمام سلکتورها برای یافتن لینک‌های تور
      selectors.forEach(selector => {
        $(selector).each((index, element) => {
          let href = $(element).attr('href');
          
          if (href) {
            // اگر لینک نسبی باشد آن را به لینک کامل تبدیل می‌کنیم
            if (!href.startsWith('http')) {
              // استخراج دامنه اصلی از URL ورودی
              const domain = new URL(url).origin;
              href = `${domain}${href.startsWith('/') ? '' : '/'}${href}`;
            }
            
            // چک کردن لینک دوباره برای اطمینان از اینکه به صفحه تور اشاره می‌کند
            if (href.includes('tour') || href.includes('package')) {
              // افزودن لینک به آرایه اگر تکراری نباشد
              if (!tourLinks.includes(href)) {
                tourLinks.push(href);
              }
            }
          }
        });
      });
      
      // اگر هیچ لینکی پیدا نشد، تلاش کنیم هر لینکی که ممکن است به تور اشاره کند را پیدا کنیم
      if (tourLinks.length === 0) {
        console.log('هیچ لینک توری با سلکتورهای اصلی پیدا نشد، تلاش با سلکتورهای عمومی...');
        
        $('a').each((index, element) => {
          let href = $(element).attr('href');
          
          if (href) {
            // فقط لینک‌هایی که احتمالاً مربوط به تور هستند را انتخاب کنیم
            if (href.includes('tour') || href.includes('package') || href.includes('travel')) {
              // اگر لینک نسبی باشد آن را به لینک کامل تبدیل می‌کنیم
              if (!href.startsWith('http')) {
                const domain = new URL(url).origin;
                href = `${domain}${href.startsWith('/') ? '' : '/'}${href}`;
              }
              
              // افزودن لینک به آرایه اگر تکراری نباشد
              if (!tourLinks.includes(href)) {
                tourLinks.push(href);
              }
            }
          }
        });
      }
      
      console.log(`تعداد ${tourLinks.length} لینک تور پیدا شد`);
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
      
      // استخراج خدمات تور - استفاده از سلکتورهای متعدد برای یافتن خدمات
      const services: string[] = [];
      
      // لیست سلکتورهای خدمات تور
      const serviceSelectors = [
        '.border-dashed li',
        '.services-list li', 
        '.tour-services li',
        '.tour-service-item',
        '.service-list-item',
        '.tour-amenities li',
        '.package-services li',
        '.inclusions li',
        '.features-list li'
      ];
      
      // استخراج تمام خدمات با استفاده از سلکتورهای مختلف
      serviceSelectors.forEach(selector => {
        $(selector).each((_, element) => {
          const service = $(element).text().trim();
          if (service && !services.includes(service)) {
            services.push(service);
          }
        });
      });
      
      // اگر هیچ خدمتی پیدا نشد، از عناصر با کلاس‌هایی که ممکن است خدمات را شامل شوند استفاده کنیم
      if (services.length === 0) {
        console.log('هیچ خدمتی با سلکتورهای اصلی پیدا نشد، تلاش دوم...');
        
        // تلاش برای یافتن خدمات در پاراگراف‌ها یا عناصر دیگر
        $('p:contains("شامل"), div:contains("شامل"), span:contains("شامل"), p:contains("خدمات"), div:contains("خدمات")').each((_, element) => {
          const text = $(element).text().trim();
          if (text && text.length < 200) { // فقط متن‌های کوتاه را به عنوان خدمت در نظر بگیریم
            services.push(text);
          }
        });
      }
      
      // اگر هنوز خدمتی پیدا نشد، حداقل چند خدمت استاندارد را اضافه کنیم
      if (services.length === 0) {
        services.push(
          'اقامت در هتل',
          'بیمه مسافرتی',
          'ترانسفر فرودگاهی',
          'راهنمای تور'
        );
      }
      
      // استخراج اطلاعات هتل‌ها - بهبود سلکتورها
      const hotels: Array<{
        name: string;
        rating: string;
        stars: number;
        price: string;
        imageUrl: string;
      }> = [];
      
      // لیست سلکتورهای هتل
      const hotelSelectors = [
        '.hotel-item', 
        '.tour-hotel', 
        '.hotel-card',
        '.accommodation-item',
        '.hotel-option',
        '.package-hotel',
        '.hotel-container',
        'div[id*="hotel"]',
        '.hotel'
      ];
      
      // اطلاعات تمام هتل‌ها را با استفاده از سلکتورهای مختلف استخراج کنیم
      for (const selector of hotelSelectors) {
        const hotelElements = $(selector);
        if (hotelElements.length > 0) {
          hotelElements.each((index, element) => {
            // یافتن نام هتل با سلکتورهای مختلف
            let hotelName = '';
            const nameSelectors = ['.hotel-name', '.hotel-title', 'h3', 'h4', 'strong', '.name', '.title'];
            for (const nameSelector of nameSelectors) {
              const nameElement = $(element).find(nameSelector).first();
              if (nameElement.length > 0) {
                hotelName = nameElement.text().trim();
                if (hotelName) break;
              }
            }
            
            // اگر هیچ یک از سلکتورها موفق نبود، از متن خود المان استفاده کنیم
            if (!hotelName) {
              hotelName = $(element).text().trim().split('\n')[0] || `هتل شماره ${index + 1}`;
            }
            
            // یافتن امتیاز هتل
            let hotelRating = 'خوب';
            const ratingSelectors = ['.hotel-rating', '.rating-text', '.rating', '.score'];
            for (const ratingSelector of ratingSelectors) {
              const ratingElement = $(element).find(ratingSelector).first();
              if (ratingElement.length > 0) {
                const ratingText = ratingElement.text().trim();
                if (ratingText) {
                  hotelRating = ratingText;
                  break;
                }
              }
            }
            
            // استخراج تعداد ستاره‌ها با الگوریتم بهبود یافته
            let stars = 0;
            const starsSelectors = ['.hotel-stars', '.star-rating', '.stars', '.rating-stars'];
            let starsText = '';
            
            for (const starsSelector of starsSelectors) {
              const starsElement = $(element).find(starsSelector).first();
              if (starsElement.length > 0) {
                starsText = starsElement.text().trim();
                if (starsText) break;
              }
            }
            
            if (starsText) {
              if (starsText.includes('⭐️')) {
                stars = (starsText.match(/⭐️/g) || []).length;
              } else if (starsText.includes('★')) {
                stars = (starsText.match(/★/g) || []).length;
              } else if (starsText.includes('ستاره')) {
                // استخراج عدد از متن فارسی مثل "هتل 5 ستاره"
                const match = starsText.match(/(\d+)\s*ستاره/);
                if (match && match[1]) {
                  stars = parseInt(match[1]);
                }
              } else {
                // اعداد احتمالی در متن
                for (let i = 5; i >= 1; i--) {
                  if (starsText.includes(i.toString())) {
                    stars = i;
                    break;
                  }
                }
              }
            }
            
            // اگر هنوز نتوانستیم ستاره‌ها را تشخیص دهیم، از کلاس‌ها استفاده کنیم
            if (stars === 0) {
              if ($(element).hasClass('five-star') || hotelName.includes('5') || hotelName.includes('پنج')) stars = 5;
              else if ($(element).hasClass('four-star') || hotelName.includes('4') || hotelName.includes('چهار')) stars = 4;
              else if ($(element).hasClass('three-star') || hotelName.includes('3') || hotelName.includes('سه')) stars = 3;
              else if ($(element).hasClass('two-star') || hotelName.includes('2') || hotelName.includes('دو')) stars = 2;
              else if ($(element).hasClass('one-star') || hotelName.includes('1') || hotelName.includes('یک')) stars = 1;
              else stars = 4; // مقدار پیش‌فرض معقول
            }
            
            // استخراج قیمت هتل با سلکتورهای بهبود یافته
            let price = 'قیمت متغیر';
            const priceSelectors = ['.hotel-price', '.price-text', '.price', '.amount', '.cost'];
            
            for (const priceSelector of priceSelectors) {
              const priceElement = $(element).find(priceSelector).first();
              if (priceElement.length > 0) {
                const priceText = priceElement.text().trim();
                if (priceText) {
                  price = priceText;
                  break;
                }
              }
            }
            
            // استخراج تصویر هتل با سلکتورهای بهبود یافته
            let imageUrl = '';
            const imgElements = $(element).find('img');
            
            if (imgElements.length > 0) {
              const imgSrc = imgElements.first().attr('src');
              if (imgSrc) {
                imageUrl = imgSrc;
              }
            }
            
            // افزودن هتل به لیست هتل‌ها
            hotels.push({
              name: hotelName,
              rating: hotelRating,
              stars: stars,
              price: price,
              imageUrl: imageUrl
            });
          });
          
          // اگر با این سلکتور هتل‌هایی پیدا کردیم، از حلقه خارج شویم
          if (hotels.length > 0) {
            break;
          }
        }
      }
      
      // اگر هیچ هتلی پیدا نشد، حداقل یک هتل پیش‌فرض ایجاد کنیم
      if (hotels.length === 0) {
        // سعی کنیم از عنوان تور نام هتل را استخراج کنیم
        const hotelNameMatch = title.match(/هتل\s+(.+?)(\s|$)/i);
        const defaultHotelName = hotelNameMatch ? hotelNameMatch[1] : "هتل اصلی تور";
        
        hotels.push({
          name: defaultHotelName,
          rating: "خوب",
          stars: 4,
          price: "قیمت متغیر",
          imageUrl: ""
        });
      }
      
      // استخراج مدارک مورد نیاز با سلکتورهای بهبود یافته
      const requiredDocuments: string[] = [];
      
      // لیست سلکتورهای مدارک مورد نیاز
      const docSelectors = [
        '.required-documents li', 
        '.documents-list li',
        '.documents li',
        '.required-docs li',
        '.needed-documents li',
        '.document-requirements li',
        '.document-item',
        '.document-requirement',
        '.required-item'
      ];
      
      // استخراج تمام مدارک با استفاده از سلکتورهای مختلف
      docSelectors.forEach(selector => {
        $(selector).each((_, element) => {
          const doc = $(element).text().trim();
          if (doc && !requiredDocuments.includes(doc)) {
            requiredDocuments.push(doc);
          }
        });
      });
      
      // اگر هیچ مدرکی پیدا نشد، تلاش کنیم از محتوای پاراگراف‌ها
      if (requiredDocuments.length === 0) {
        // جستجو برای پاراگراف‌هایی که حاوی کلمات کلیدی هستند
        $('p:contains("مدارک"), div:contains("مدارک"), p:contains("مدرک"), div:contains("مدرک")').each((_, element) => {
          const text = $(element).text().trim();
          if (text && text.length < 300) {
            // اگر متن کوتاه است، آن را به عنوان یک مدرک اضافه کنیم
            requiredDocuments.push(text);
          } else if (text) {
            // اگر متن طولانی است، فرض کنیم حاوی چندین مدرک است که با نقطه یا خط جدید جدا شده‌اند
            const items = text.split(/[.\n]+/);
            items.forEach(item => {
              const trimmedItem = item.trim();
              if (trimmedItem && trimmedItem.includes('مدرک') && trimmedItem.length < 100) {
                requiredDocuments.push(trimmedItem);
              }
            });
          }
        });
      }
      
      // اگر هنوز هیچ مدرکی پیدا نشد، مدارک استاندارد را اضافه کنیم
      if (requiredDocuments.length === 0) {
        const isForeign = this.isForeignTour(title);
        
        if (isForeign) {
          // مدارک استاندارد برای تورهای خارجی
          requiredDocuments.push(
            'پاسپورت با حداقل 6 ماه اعتبار',
            'کارت ملی',
            'شناسنامه',
            'عکس 4x6 با زمینه سفید',
            'رزرو هتل'
          );
        } else {
          // مدارک استاندارد برای تورهای داخلی
          requiredDocuments.push(
            'کارت ملی',
            'شناسنامه',
            'مدارک شناسایی معتبر'
          );
        }
      }
      
      // استخراج قوانین کنسلی با سلکتورهای بهبود یافته
      let cancellationPolicy = '';
      
      // لیست سلکتورهای قوانین کنسلی
      const policySelectors = [
        '.cancellation-policy', 
        '.cancel-rules',
        '.cancellation',
        '.cancel-policy',
        '.refund-policy',
        '.policy-container',
        '.rules-section'
      ];
      
      // جستجو با سلکتورهای مختلف
      for (const selector of policySelectors) {
        const policyElement = $(selector);
        if (policyElement.length > 0) {
          const policyText = policyElement.text().trim();
          if (policyText && policyText.length > 20) { // باید به اندازه کافی طولانی باشد
            cancellationPolicy = policyText;
            break;
          }
        }
      }
      
      // اگر هنوز قانون کنسلی پیدا نشد، از عناصر حاوی کلمات کلیدی استفاده کنیم
      if (!cancellationPolicy) {
        // جستجو برای عناصری که حاوی کلمات کلیدی هستند
        $('p:contains("کنسلی"), div:contains("کنسلی"), span:contains("کنسلی"), p:contains("لغو"), div:contains("لغو")').each((_, element) => {
          const text = $(element).text().trim();
          if (text && text.length > 20 && text.length < 500) {
            cancellationPolicy = text;
            return false; // خروج از حلقه
          }
        });
      }
      
      // اگر هنوز قانون کنسلی پیدا نشد، یک قانون پیش‌فرض ارائه دهیم
      if (!cancellationPolicy) {
        cancellationPolicy = 'لطفا برای اطلاع از قوانین کنسلی و استرداد با آژانس تماس بگیرید.';
      }
      
      // تصویر تور با سلکتورهای بهبود یافته
      let imageUrl = '';
      
      // لیست سلکتورهای تصویر تور
      const imageSelectors = [
        '.tour-image img',
        '.package-image img',
        '.main-image img',
        '.tour-banner img',
        '.tour-cover img',
        '.package-banner img',
        '.featured-image img',
        '.hero-image img',
        '.cover-photo img',
        '.thumbnail img',
        '.header-image img'
      ];
      
      // جستجو با سلکتورهای مختلف
      for (const selector of imageSelectors) {
        const imgElement = $(selector).first();
        if (imgElement.length > 0) {
          const imgSrc = imgElement.attr('src');
          if (imgSrc) {
            imageUrl = imgSrc;
            
            // اگر آدرس تصویر نسبی است، آن را به آدرس کامل تبدیل کنیم
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
              const domain = new URL(url).origin;
              imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }
            
            break;
          }
        }
      }
      
      // اگر هنوز تصویری پیدا نشد، از تصاویر اسلایدر استفاده کنیم
      if (!imageUrl) {
        $('.slider img, .carousel img, .gallery img, .slideshow img').each((index, element) => {
          const imgSrc = $(element).attr('src');
          if (imgSrc && !imageUrl) {
            imageUrl = imgSrc;
            
            // اگر آدرس تصویر نسبی است، آن را به آدرس کامل تبدیل کنیم
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
              const domain = new URL(url).origin;
              imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }
          }
        });
      }
      
      // اگر هنوز تصویری پیدا نشد، از هر تصویری در صفحه استفاده کنیم
      if (!imageUrl) {
        $('img').each((index, element) => {
          const imgSrc = $(element).attr('src');
          const imgWidth = $(element).attr('width');
          const imgHeight = $(element).attr('height');
          
          // فقط تصاویر با اندازه منطقی را انتخاب کنیم (برای اجتناب از آیکون‌ها)
          const width = imgWidth ? parseInt(imgWidth) : 0;
          const height = imgHeight ? parseInt(imgHeight) : 0;
          
          if (imgSrc && (width > 200 || height > 200 || (!width && !height)) && !imageUrl) {
            // از تصاویر کوچک مثل آیکون‌ها اجتناب کنیم
            if (!imgSrc.includes('icon') && !imgSrc.includes('logo') && imgSrc.length > 10) {
              imageUrl = imgSrc;
              
              // اگر آدرس تصویر نسبی است، آن را به آدرس کامل تبدیل کنیم
              if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                const domain = new URL(url).origin;
                imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              }
            }
          }
        });
      }
      
      // مدت زمان تور با سلکتورهای بهبود یافته
      let duration = '';
      
      // لیست سلکتورهای مدت زمان تور
      const durationSelectors = [
        '.tour-duration',
        '.package-duration',
        '.duration-text',
        '.trip-length',
        '.tour-length',
        '.days-count',
        '.nights-count',
        'span:contains("روز")',
        'div:contains("روز")',
        'span:contains("شب")',
        'div:contains("شب")'
      ];
      
      // جستجو با سلکتورهای مختلف
      for (const selector of durationSelectors) {
        const durationElement = $(selector).first();
        if (durationElement.length > 0) {
          const durationText = durationElement.text().trim();
          if (durationText && durationText.length < 50) {
            // استخراج مدت زمان به شکل "X روز و Y شب"
            if (durationText.includes('روز') || durationText.includes('شب')) {
              duration = durationText;
              break;
            }
          }
        }
      }
      
      // اگر از سلکتورهای اصلی مدت زمان پیدا نشد، از عنوان تور استفاده کنیم
      if (!duration) {
        const titleMatch = title.match(/(\d+)\s*(روز|شب)/i);
        if (titleMatch) {
          duration = `${titleMatch[1]} ${titleMatch[2]}`;
        } else {
          duration = '3 روز'; // مقدار پیش‌فرض
        }
      }
      
      // قیمت تور با سلکتورهای بهبود یافته
      let price = '';
      
      // لیست سلکتورهای قیمت تور
      const priceSelectors = [
        '.tour-price',
        '.package-price',
        '.price-value',
        '.price-amount',
        '.cost-value',
        '.price',
        '.cost',
        '.amount',
        'span:contains("تومان")',
        'div:contains("تومان")',
        'span:contains("ریال")',
        'div:contains("ریال")'
      ];
      
      // جستجو با سلکتورهای مختلف
      for (const selector of priceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length > 0) {
          const priceText = priceElement.text().trim();
          if (priceText && (priceText.includes('تومان') || priceText.includes('ریال') || priceText.includes(',') || /\d{5,}/.test(priceText))) {
            price = priceText;
            break;
          }
        }
      }
      
      // اگر قیمت پیدا نشد، مقدار پیش‌فرض ارائه دهیم
      if (!price) {
        price = 'قیمت متغیر';
      }
      
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