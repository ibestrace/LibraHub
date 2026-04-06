// TinyNews ISBN API 数据获取
import type { Book } from '@/types';

/**
 * 从 TinyNews ISBN API 获取书籍信息
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
export async function fetchFromTinyNews(isbn: string): Promise<Partial<Book> | null> {
  try {
    const url = `https://isbn.tinynews.org/api/v1/book/${encodeURIComponent(isbn)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 解析 TinyNews API 响应
    const bookInfo = parseTinyNewsResponse(data, isbn);
    return bookInfo;
  } catch (error) {
    console.error('TinyNews ISBN API 请求失败:', error);
    return null;
  }
}

/**
 * 解析 TinyNews API 响应
 * @param data API 响应数据
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
function parseTinyNewsResponse(data: any, isbn: string): Partial<Book> | null {
  try {
    if (!data || !data.title) {
      return null;
    }
    
    const title = data.title || '';
    const authors = data.author ? data.author.split('; ').filter((author: string) => author.trim()) : [];
    const publisher = data.publisher || '';
    const pubDate = data.publishedDate || data.pubDate || '';
    const pages = data.pageCount || data.pages || 0;
    const price = data.price ? parseFloat(data.price.replace(/[^0-9.]/g, '')) || undefined : undefined;
    const cover = data.thumbnail || data.cover || '';
    
    return {
      title,
      author: authors.join('; '),
      publisher,
      publishDate: pubDate,
      pageCount: pages,
      price,
      cover,
      isbn
    };
  } catch (error) {
    console.error('解析 TinyNews API 响应失败:', error);
    return null;
  }
}
