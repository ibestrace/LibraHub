// 临时脚本，用于查询本地ISBN数据库中的书籍数量
import { isbnCache } from './src/services/isbn/cache.js';

async function getLocalDatabaseCount() {
  try {
    const stats = await isbnCache.getLocalDatabaseStats();
    console.log(`本地ISBN数据库收录了 ${stats.size} 本书籍信息`);
  } catch (error) {
    console.error('查询本地数据库失败:', error);
    console.log('本地ISBN数据库收录了 0 本书籍信息');
  }
}

getLocalDatabaseCount();
