// 预缓存服务
// 在应用启动时预加载常用数据，提高用户体验

import { BookService, CategoryService, MemberTypeService, MemberService, BorrowService } from './storage';
import { IsbnService } from './isbn';

class PrecacheService {
  // 预缓存常用数据
  static async precache(): Promise<void> {
    console.log('开始预缓存数据...');
    
    try {
      // 1. 预加载分类数据
      await this.precacheCategories();
      
      // 2. 预加载会员类型数据
      await this.precacheMemberTypes();
      
      // 3. 预加载最近使用的书籍
      await this.precacheRecentBooks();
      
      // 4. 预缓存热门书籍的ISBN信息
      await this.precachePopularIsbns();
      
      console.log('预缓存完成');
    } catch (error) {
      console.error('预缓存失败:', error);
    }
  }

  // 预加载分类数据
  private static async precacheCategories(): Promise<void> {
    try {
      const categories = CategoryService.getAll();
      console.log(`预加载分类数据: ${categories.length} 个分类`);
    } catch (error) {
      console.error('预加载分类数据失败:', error);
    }
  }

  // 预加载会员类型数据
  private static async precacheMemberTypes(): Promise<void> {
    try {
      const memberTypes = MemberTypeService.getAll();
      console.log(`预加载会员类型数据: ${memberTypes.length} 个类型`);
    } catch (error) {
      console.error('预加载会员类型数据失败:', error);
    }
  }

  // 预加载最近使用的书籍
  private static async precacheRecentBooks(): Promise<void> {
    try {
      const books = BookService.getAll();
      // 按更新时间排序，取最近的10本
      const recentBooks = books
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10);
      console.log(`预加载最近书籍: ${recentBooks.length} 本`);
    } catch (error) {
      console.error('预加载最近书籍失败:', error);
    }
  }

  // 预缓存热门书籍的ISBN信息
  private static async precachePopularIsbns(): Promise<void> {
    try {
      // 获取借阅次数最多的书籍
      const books = BookService.getAll();
      const popularBooks = books
        .filter(book => book.isbn && book.borrowCount > 0)
        .sort((a, b) => b.borrowCount - a.borrowCount)
        .slice(0, 5);

      console.log(`预缓存热门书籍ISBN: ${popularBooks.length} 本`);

      // 并行预缓存ISBN信息
      const isbnPromises = popularBooks.map(async (book) => {
        try {
          if (book.isbn) {
            await IsbnService.fetchByIsbn(book.isbn);
          }
        } catch (error) {
          console.error(`预缓存ISBN ${book.isbn} 失败:`, error);
        }
      });

      await Promise.all(isbnPromises);
    } catch (error) {
      console.error('预缓存热门ISBN失败:', error);
    }
  }

  // 预缓存统计数据
  static async precacheStats(): Promise<void> {
    try {
      // 预计算各种统计数据
      const bookStats = BookService.getStats();
      const memberStats = MemberService.getStats();
      const borrowStats = BorrowService.getStats();
      
      console.log('预缓存统计数据完成');
      console.log('书籍统计:', bookStats);
      console.log('会员统计:', memberStats);
      console.log('借阅统计:', borrowStats);
    } catch (error) {
      console.error('预缓存统计数据失败:', error);
    }
  }

  // 预缓存所有数据（适用于后台任务）
  static async precacheAll(): Promise<void> {
    console.log('开始预缓存所有数据...');
    await this.precache();
    await this.precacheStats();
    console.log('所有数据预缓存完成');
  }
}

export { PrecacheService };
