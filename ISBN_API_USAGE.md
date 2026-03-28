# ISBN API 使用示例

## 📚 快速使用

### 基本用法

```typescript
import { IsbnService } from '@/services/isbn';

// 获取书籍信息
const bookInfo = await IsbnService.fetchByIsbn('9787111544937');

console.log(bookInfo);
// 输出:
// {
//   title: "JavaScript 高级程序设计",
//   subtitle: "第4版",
//   author: "Matt Frisbie",
//   publisher: "人民邮电出版社",
//   publishDate: "2020-09-01",
//   isbn: "9787111544937",
//   pageCount: 865,
//   description: "本书是 JavaScript 开发者必备的经典教程...",
//   cover: "https://covers.openlibrary.org/b/id/12345678-L.jpg"
// }
```

### 在表单中使用

```typescript
const [isFetchingIsbn, setIsFetchingIsbn] = useState(false);

const handleIsbnBlur = async () => {
  const isbn = formData.isbn?.trim() || '';

  if (!isbn || !IsbnService.isValidIsbn(isbn)) {
    toast.error('请输入有效的 ISBN');
    return;
  }

  setIsFetchingIsbn(true);
  try {
    const bookInfo = await IsbnService.fetchByIsbn(isbn);

    if (bookInfo) {
      setFormData(prev => ({
        ...prev,
        ...bookInfo,
        isbn,
      }));
      toast.success('书籍信息已自动填充');
    } else {
      toast.info('未找到书籍信息,请手动填写');
    }
  } catch (error) {
    toast.error('查询失败,请手动填写');
  } finally {
    setIsFetchingIsbn(false);
  }
};

// JSX
<Input
  placeholder="请输入 ISBN"
  onBlur={handleIsbnBlur}
  disabled={isFetchingIsbn}
/>
{isFetchingIsbn && <span>正在查询...</span>}
```

## 🔧 API 配置管理

### 查看当前配置

```typescript
const configs = IsbnService.getApiConfigs();

configs.forEach(api => {
  console.log(`${api.name}: ${api.enabled ? '启用' : '禁用'} (优先级: ${api.priority})`);
});
```

### 修改配置

```typescript
// 禁用豆瓣 API
IsbnService.setApiConfig('Douban', false);

// 只使用 OpenLibrary
IsbnService.setApiConfig('OpenLibrary', true, 1);

// 恢复默认配置
IsbnService.setApiConfig('OpenLibrary', true, 1);
IsbnService.setApiConfig('Douban', true, 2);
```

## 🌐 直接调用特定 API

### 使用 OpenLibrary

```typescript
// 已在 fetchByIsbn 中自动调用
// 如需单独使用,修改优先级
IsbnService.setApiConfig('Douban', false); // 禁用其他 API
```

### 使用豆瓣 API

```typescript
// 将豆瓣 API 设为最高优先级
IsbnService.setApiConfig('Douban', true, 1);
```

## 📋 完整示例组件

```tsx
import { useState } from 'react';
import { IsbnService } from '@/services/isbn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

export function BookSearch() {
  const [isbn, setIsbn] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [bookInfo, setBookInfo] = useState<any>(null);

  const handleSearch = async () => {
    if (!isbn) {
      toast.error('请输入 ISBN');
      return;
    }

    if (!IsbnService.isValidIsbn(isbn)) {
      toast.error('无效的 ISBN 格式');
      return;
    }

    setIsFetching(true);
    try {
      const info = await IsbnService.fetchByIsbn(isbn);
      if (info) {
        setBookInfo(info);
        toast.success('查询成功');
      } else {
        toast.error('未找到书籍信息');
      }
    } catch (error) {
      toast.error('查询失败');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="输入 ISBN (例如: 9787111544937)"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          查询
        </Button>
      </div>

      {bookInfo && (
        <div className="border rounded-lg p-4 space-y-2">
          {bookInfo.cover && (
            <img
              src={bookInfo.cover}
              alt={bookInfo.title}
              className="w-32 h-48 object-cover"
            />
          )}
          <h3 className="text-xl font-bold">{bookInfo.title}</h3>
          {bookInfo.subtitle && (
            <p className="text-gray-600">{bookInfo.subtitle}</p>
          )}
          <p><strong>作者:</strong> {bookInfo.author}</p>
          <p><strong>出版社:</strong> {bookInfo.publisher}</p>
          <p><strong>出版日期:</strong> {bookInfo.publishDate}</p>
          {bookInfo.pageCount && (
            <p><strong>页数:</strong> {bookInfo.pageCount}</p>
          )}
          {bookInfo.description && (
            <p className="text-gray-700">{bookInfo.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🧪 测试 ISBN 列表

以下是可用于测试的 ISBN:

| ISBN | 书名 | 作者 | 预期数据源 |
|------|------|------|-----------|
| 9787111544937 | JavaScript 高级程序设计 | Matt Frisbie | OpenLibrary |
| 9787121396883 | Vue.js设计与实现 | 霍春阳 | OpenLibrary |
| 9787544270365 | 解忧杂货店 | 东野圭吾 | 豆瓣 |
| 9787302108363 | 深入理解计算机系统 | Randal E. Bryant | OpenLibrary |

## 💡 实用技巧

### 1. ISBN 验证

```typescript
// 验证 ISBN 格式
const isValid = IsbnService.isValidIsbn('9787111544937');
console.log(isValid); // true

// 验证 ISBN-10
const isValid10 = IsbnService.isValidIsbn('711154493X');
console.log(isValid10); // true
```

### 2. ISBN 转换

```typescript
// ISBN-10 转 ISBN-13
const isbn13 = IsbnService.isbn10To13('711154493X');
console.log(isbn13); // "9787111544937"
```

### 3. 格式化显示

```typescript
// 格式化 ISBN 显示
const formatted = IsbnService.formatIsbn('9787111544937');
console.log(formatted); // "978-7-1154-4937-7"
```

### 4. 批量查询

```typescript
const isbns = ['9787111544937', '9787121396883', '9787544270365'];

const results = await Promise.allSettled(
  isbns.map(isbn => IsbnService.fetchByIsbn(isbn))
);

results.forEach((result, index) => {
  if (result.status === 'fulfilled' && result.value) {
    console.log(`✓ ${isbns[index]}: ${result.value.title}`);
  } else {
    console.log(`✗ ${isbns[index]}: 查询失败`);
  }
});
```

### 5. 错误处理

```typescript
const fetchWithErrorHandling = async (isbn: string) => {
  try {
    // 清理输入
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // 验证格式
    if (!IsbnService.isValidIsbn(cleanIsbn)) {
      throw new Error('无效的 ISBN 格式');
    }

    // 查询
    const bookInfo = await IsbnService.fetchByIsbn(cleanIsbn);

    if (!bookInfo) {
      throw new Error('未找到书籍信息');
    }

    return bookInfo;
  } catch (error) {
    console.error('查询失败:', error);
    // 返回默认值或抛出错误
    return null;
  }
};
```

## 🎯 使用场景

### 场景 1: 扫码添加书籍

```typescript
// 扫码后自动查询
const handleBarcodeScan = async (barcode: string) => {
  // 先检查是否已存在
  const existingBook = getBookByBarcode(barcode);

  if (existingBook) {
    toast.info(`找到书籍: ${existingBook.title}`);
    return existingBook;
  }

  // 新书籍,尝试通过 ISBN 查询
  const isbn = barcode; // 假设条形码就是 ISBN
  const bookInfo = await IsbnService.fetchByIsbn(isbn);

  if (bookInfo) {
    // 自动填充并打开添加弹窗
    setFormData({ ...bookInfo, barcode });
    setIsAddDialogOpen(true);
    toast.success('书籍信息已自动填充');
  } else {
    // 打开空表单
    setFormData({ barcode });
    setIsAddDialogOpen(true);
    toast.success('请手动填写书籍信息');
  }
};
```

### 场景 2: 导入数据

```typescript
const importBooks = async (csvData: string[]) => {
  const results = [];

  for (const row of csvData) {
    const isbn = row.isbn;
    const bookInfo = await IsbnService.fetchByIsbn(isbn);

    results.push({
      ...bookInfo,
      barcode: row.barcode,
      stock: row.stock,
    });

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
};
```

### 场景 3: 搜索建议

```typescript
const searchSuggestions = async (query: string) => {
  if (query.length !== 13 && query.length !== 10) {
    return [];
  }

  if (IsbnService.isValidIsbn(query)) {
    const bookInfo = await IsbnService.fetchByIsbn(query);
    return bookInfo ? [bookInfo] : [];
  }

  return [];
};
```

## 📊 性能优化

### 防抖处理

```typescript
import { debounce } from 'lodash';

const debouncedFetch = debounce(async (isbn: string) => {
  const bookInfo = await IsbnService.fetchByIsbn(isbn);
  if (bookInfo) {
    setFormData(prev => ({ ...prev, ...bookInfo, isbn }));
  }
}, 500);

// 使用
<Input onChange={(e) => debouncedFetch(e.target.value)} />
```

### 本地缓存

```typescript
const bookCache = new Map<string, any>();

const fetchWithCache = async (isbn: string) => {
  if (bookCache.has(isbn)) {
    return bookCache.get(isbn);
  }

  const bookInfo = await IsbnService.fetchByIsbn(isbn);
  if (bookInfo) {
    bookCache.set(isbn, bookInfo);
  }

  return bookInfo;
};
```

## ❓ 常见问题

### Q: 查询不到某些书籍?

**A**: 尝试以下方法:
1. 检查 ISBN 格式是否正确
2. 启用多个数据源
3. 手动补充书籍信息

### Q: 如何处理网络错误?

**A**: 实现重试机制:
```typescript
const fetchWithRetry = async (isbn: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await IsbnService.fetchByIsbn(isbn);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

---

**提示**: 详细配置说明请查看 `OPENLIBRARY_CONFIG.md`! 📖
