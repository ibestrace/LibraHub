// 图像优化服务
// 提供图像懒加载、压缩和处理功能

class ImageService {
  // 图像懒加载配置
  private static readonly LAZY_LOAD_CONFIG = {
    threshold: 0.1, // 当图像进入视口10%时加载
    rootMargin: '200px' // 提前200px开始加载
  };

  // 初始化图像懒加载
  static initLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.classList.remove('opacity-0', 'blur-sm');
              img.classList.add('opacity-100', 'transition-opacity', 'duration-300');
              observer.unobserve(img);
            }
          }
        });
      }, this.LAZY_LOAD_CONFIG);

      // 观察所有带有 data-src 属性的图像
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });

      console.log('图像懒加载初始化完成');
    }
  }

  // 生成图像占位符
  static generatePlaceholder(width: number, height: number): string {
    // 使用 SVG 作为占位符
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"%3E%3Crect width="${width}" height="${height}" fill="%23f1f5f9"/%3E%3C/svg%3E`;
  }

  // 优化图像 URL
  static optimizeImageUrl(url: string): string {
    // 这里可以集成图像CDN服务，如 Cloudinary、Imgix 等
    // 目前返回原始 URL
    return url;
  }

  // 压缩图像
  static async compressImage(file: File, options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 计算新尺寸
        const maxWidth = options?.maxWidth || 800;
        const maxHeight = options?.maxHeight || 600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制图像
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          options?.quality || 0.8
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // 生成图像缩略图
  static async generateThumbnail(file: File, size: number = 150): Promise<Blob> {
    return this.compressImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7
    });
  }

  // 验证图像文件
  static validateImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  // 处理书籍封面图像
  static async processBookCover(file: File): Promise<{ original: Blob; thumbnail: Blob }> {
    const original = await this.compressImage(file, {
      maxWidth: 800,
      maxHeight: 1200,
      quality: 0.85
    });

    const thumbnail = await this.generateThumbnail(file, 150);

    return { original, thumbnail };
  }

  // 获取图像尺寸
  static getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }
}

export { ImageService };
