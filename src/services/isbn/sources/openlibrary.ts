// OpenLibrary API 数据获取
import type { Book } from '@/types';

/**
 * 从 OpenLibrary API 获取书籍信息
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
export async function fetchFromOpenLibrary(isbn: string): Promise<Partial<Book> | null> {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    
    // 国际 API，国内访问慢，设置 3s 超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 解析 OpenLibrary API 响应
    const bookInfo = parseOpenLibraryResponse(data, isbn);
    return bookInfo;
  } catch (error) {
    const errorName = (error as Error).name || 'Unknown';
    if (errorName === 'AbortError') {
      console.warn('OpenLibrary API 请求超时（3s），跳过');
    } else {
      console.error('OpenLibrary API 请求失败:', error);
    }
    return null;
  }
}

/**
 * 解析 OpenLibrary API 响应
 * @param data API 响应数据
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
function parseOpenLibraryResponse(data: any, isbn: string): Partial<Book> | null {
  try {
    const key = `ISBN:${isbn}`;
    if (!data || !data[key]) {
      return null;
    }
    
    const book = data[key];
    
    const title = book.title || '';
    const authors = book.authors ? book.authors.map((author: any) => author.name) : [];
    const publisher = book.publishers ? book.publishers[0].name : '';
    const pubDate = book.publish_date || '';
    const pages = book.number_of_pages || 0;
    const cover = book.cover ? `https://covers.openlibrary.org/b/id/${book.cover.medium}.jpg` : '';
    
    return {
      title,
      author: authors.join('; '),
      publisher,
      publishDate: pubDate,
      pageCount: pages,
      price: undefined,
      cover,
      isbn
    };
  } catch (error) {
    console.error('解析 OpenLibrary API 响应失败:', error);
    return null;
  }
}
