// 豆瓣网页数据抓取
import type { Book } from '@/types';

/**
 * 从豆瓣网页抓取书籍信息
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
export async function fetchFromDoubanWeb(isbn: string): Promise<Partial<Book> | null> {
  try {
    const url = `https://book.douban.com/isbn/${isbn}/`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 解析 HTML 获取书籍信息
    const bookInfo = parseDoubanHtml(html);
    return bookInfo;
  } catch (error) {
    console.error('豆瓣网页抓取失败:', error);
    return null;
  }
}

/**
 * 解析豆瓣网页 HTML
 * @param html HTML 内容
 * @returns 书籍信息
 */
function parseDoubanHtml(html: string): Partial<Book> | null {
  try {
    // 提取书名
    const titleMatch = html.match(/<span property="v:itemreviewed">(.*?)<\/span>/);
    if (!titleMatch) return null;
    const title = titleMatch[1].trim();
    
    // 提取作者
    const authorMatch = html.match(/<span class="pl">作者<\/span>:(.*?)<br\s*\/>/s);
    let authors: string[] = [];
    if (authorMatch) {
      authors = authorMatch[1]
        .replace(/<[^>]*>/g, '')
        .split('/')
        .map(author => author.trim())
        .filter(Boolean);
    }
    
    // 提取出版社
    const publisherMatch = html.match(/<span class="pl">出版社:<\/span>(.*?)<br\s*\/>/);
    const publisher = publisherMatch ? publisherMatch[1].trim() : '';
    
    // 提取出版日期
    const pubDateMatch = html.match(/<span class="pl">出版年:<\/span>(.*?)<br\s*\/>/);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    
    // 提取页数
    const pagesMatch = html.match(/<span class="pl">页数:<\/span>(.*?)<br\s*\/>/);
    const pages = pagesMatch ? parseInt(pagesMatch[1].trim(), 10) || 0 : 0;
    
    // 提取价格
    const priceMatch = html.match(/<span class="pl">定价:<\/span>(.*?)<br\s*\/>/);
    const price = priceMatch ? priceMatch[1].trim() : '';
    
    // 提取封面图片
    const coverMatch = html.match(/<img\s+src="(https:\/\/img\.doubanio\.com\/view\/subject\/s\/public\/s\d+\.jpg)"/);
    const cover = coverMatch ? coverMatch[1] : '';
    
    // 提取ISBN
    const isbnMatch = html.match(/<span class="pl">ISBN:<\/span>(.*?)<br\s*\/>/);
    const isbn = isbnMatch ? isbnMatch[1].trim() : '';
    
    return {
      title,
      author: authors.join('; '),
      publisher,
      publishDate: pubDate,
      pageCount: pages,
      price: parseFloat(price.replace(/[^0-9.]/g, '')) || undefined,
      cover,
      isbn
    };
  } catch (error) {
    console.error('解析豆瓣 HTML 失败:', error);
    return null;
  }
}
