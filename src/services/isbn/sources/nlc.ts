// 国家图书馆 OPAC HTML 解析
import type { Book } from '@/types';
import { getNlcBaseUrl } from '../network';

/**
 * 从国家图书馆 OPAC 获取书籍信息
 * @param isbn ISBN 编号
 * @returns 书籍信息
 */
export async function fetchFromNLC(isbn: string): Promise<Partial<Book> | null> {
  try {
    const baseUrl = getNlcBaseUrl();
    // 使用 NLC OPAC 的 find-b 搜索接口
    const url = `${baseUrl}?func=find-b&request=${encodeURIComponent(isbn)}&local_base=NLC01`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 解析 NLC OPAC HTML 响应
    const bookInfo = parseNlcHtml(html, isbn);
    return bookInfo;
  } catch (error) {
    console.error('国家图书馆 OPAC 请求失败:', error);
    return null;
  }
}

/**
 * 解析 NLC OPAC HTML 响应
 * 使用 DOMParser 解析浏览器原生 HTML
 */
function parseNlcHtml(html: string, isbn: string): Partial<Book> | null {
  try {
    // 检查是否没有找到结果
    if (html.includes('未找到') || html.includes('没有找到') || html.includes('no records found')) {
      return null;
    }

    // 使用 DOMParser 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 尝试多种选择器提取书籍信息
    // NLC OPAC 使用不同的 HTML 结构，需要适配
    
    // 方法1: 查找标题
    let title = '';
    // 尝试查找包含题名的元素
    const titleSelectors = [
      'h1',
      '.title',
      '[class*="title"]',
      '[class*="tit"]',
      'td[valign="top"]',
      '.briefCitTitle',
      '.title1',
    ];
    
    for (const selector of titleSelectors) {
      const elements = doc.querySelectorAll(selector);
      for (const el of Array.from(elements)) {
        const text = el.textContent?.trim() || '';
        // 标题通常包含书名关键词且不太长
        if (text.length > 2 && text.length < 200 && 
            !text.includes('国家图书馆') && 
            !text.includes('OPAC') &&
            !text.includes('检索结果')) {
          title = text;
          break;
        }
      }
      if (title) break;
    }

    // 方法2: 从表格中提取键值对
    const infoMap: Record<string, string> = {};
    
    // 查找所有表格行
    const rows = doc.querySelectorAll('tr, .briefCitRow, [class*="brief"]');
    for (const row of Array.from(rows)) {
      const text = row.textContent?.trim() || '';
      
      // 提取 ISBN
      if (text.includes('ISBN')) {
        const isbnMatch = text.match(/ISBN[:\s]*([0-9Xx\-]+)/);
        if (isbnMatch) {
          infoMap['isbn'] = isbnMatch[1].replace(/[-\s]/g, '');
        }
      }
      
      // 提取责任者/作者
      if (text.includes('责任者') || text.includes('著者') || text.includes('作者')) {
        const authorMatch = text.match(/[责任者著者作者][:\s]*(.+)/);
        if (authorMatch) {
          infoMap['author'] = authorMatch[1].trim();
        }
      }
      
      // 提取出版社
      if (text.includes('出版') || text.includes('出版社')) {
        const pubMatch = text.match(/(?:出版(?:社|者|发行项))[:\s]*(.+)/);
        if (pubMatch) {
          infoMap['publisher'] = pubMatch[1].trim();
        }
      }
      
      // 提取出版日期
      if (text.includes('出版年') || text.includes('出版日期')) {
        const dateMatch = text.match(/(?:出版年|出版日期)[:\s]*(.+)/);
        if (dateMatch) {
          infoMap['publishDate'] = dateMatch[1].trim();
        }
      }
      
      // 提取页数
      if (text.includes('页数') || text.includes('页')) {
        const pagesMatch = text.match(/(\d+)\s*页/);
        if (pagesMatch) {
          infoMap['pages'] = pagesMatch[1];
        }
      }
      
      // 提取价格
      if (text.includes('定价') || text.includes('价格')) {
        const priceMatch = text.match(/定价[:\s]*([0-9.]+)\s*元/);
        if (priceMatch) {
          infoMap['price'] = priceMatch[1];
        }
      }
      
      // 提取摘要/简介
      if (text.includes('摘要') || text.includes('简介') || text.includes('提要')) {
        const abstractMatch = text.match(/(?:摘要|简介|提要)[:\s]*(.+)/);
        if (abstractMatch) {
          infoMap['description'] = abstractMatch[1].trim();
        }
      }
    }

    // 方法3: 使用正则表达式直接从 HTML 中提取
    if (!title) {
      // 尝试从 meta 标签中提取
      const metaTitle = doc.querySelector('meta[property="og:title"]') || 
                        doc.querySelector('meta[name="title"]');
      if (metaTitle) {
        title = metaTitle.getAttribute('content') || '';
      }
    }

    // 如果没有找到任何有效信息，返回 null
    if (!title && Object.keys(infoMap).length === 0) {
      return null;
    }

    // 构建书籍信息对象
    const bookInfo: Partial<Book> = {
      isbn: infoMap['isbn'] || isbn,
    };

    if (title) bookInfo.title = title;
    if (infoMap['author']) bookInfo.author = infoMap['author'];
    if (infoMap['publisher']) bookInfo.publisher = infoMap['publisher'];
    if (infoMap['publishDate']) bookInfo.publishDate = infoMap['publishDate'];
    if (infoMap['pages']) bookInfo.pageCount = parseInt(infoMap['pages'], 10) || undefined;
    if (infoMap['price']) bookInfo.price = parseFloat(infoMap['price']) || undefined;
    if (infoMap['description']) bookInfo.description = infoMap['description'];

    return bookInfo;
  } catch (error) {
    console.error('解析 NLC OPAC HTML 失败:', error);
    return null;
  }
}
