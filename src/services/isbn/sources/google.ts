// Google Books API 数据获取
import type { Book } from '@/types';

/**
 * 从 Google Books API 获取书籍信息
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
export async function fetchFromGoogleBooks(isbn: string): Promise<Partial<Book> | null> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`;
    
    // 国际 API，国内访问慢，设置 3s 超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 解析 Google Books API 响应
    const bookInfo = parseGoogleBooksResponse(data);
    return bookInfo;
  } catch (error) {
    const errorName = (error as Error).name || 'Unknown';
    if (errorName === 'AbortError') {
      console.warn('Google Books API 请求超时（3s），跳过');
    } else {
      console.error('Google Books API 请求失败:', error);
    }
    return null;
  }
}

/**
 * 解析 Google Books API 响应
 * @param data API 响应数据
 * @returns 书籍信息
 */
function parseGoogleBooksResponse(data: any): Partial<Book> | null {
  try {
    if (!data || !data.items || data.items.length === 0) {
      return null;
    }
    
    const volume = data.items[0].volumeInfo;
    
    const title = volume.title || '';
    const authors = volume.authors || [];
    const publisher = volume.publisher || '';
    const pubDate = volume.publishedDate || '';
    const pages = volume.pageCount || 0;
    const price = volume.listPrice ? `${volume.listPrice.currencyCode} ${volume.listPrice.amount}` : '';
    const cover = volume.imageLinks ? volume.imageLinks.thumbnail : '';
    const isbn = volume.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || 
                volume.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || '';
    
    return {
      title,
      author: authors.join('; '),
      publisher,
      publishDate: pubDate,
      pageCount: pages,
      price: price ? parseFloat(price.replace(/[^0-9.]/g, '')) || undefined : undefined,
      cover,
      isbn
    };
  } catch (error) {
    console.error('解析 Google Books API 响应失败:', error);
    return null;
  }
}
