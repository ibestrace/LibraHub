# ISBN 书籍信息获取 - 数据源配置指南

## 📖 概述

LibraHub 支持多数据源获取书籍信息，优先使用**国内可直接访问**的数据源，
国际数据源作为补充（在有代理环境下生效）。

## 🌐 数据源优先级

| 优先级 | 数据源 | 可用性 | 特点 |
|--------|--------|--------|------|
| 1 | **NLC（国家图书馆 OPAC）** | ✅ 国内直连 | 权威中文书目，数据最准确 |
| 2 | **豆瓣图书（网页）** | ✅ 国内直连 | 覆盖广，有封面图，支持中英文 |
| 3 | **Google Books** | ⚠️ 需代理 | 英文书籍更全 |
| 4 | **OpenLibrary** | ⚠️ 需代理 | 开放数据，无需 API Key |

> **注意**：原豆瓣 v2 API 已停止公开访问，现改用豆瓣网页抓取方案。

## 🚀 快速开始

### 基本使用（无需任何配置）

```typescript
import { IsbnService } from '@/services/isbn';

// 自动按优先级查询，优先使用国内数据源
const bookInfo = await IsbnService.fetchByIsbn('9787111544937');

if (bookInfo) {
  console.log(bookInfo.title);     // 深入理解计算机系统
  console.log(bookInfo.author);    // Randal E. Bryant, David O'Hallaron
  console.log(bookInfo.publisher); // 机械工业出版社
}
```

### 在表单中使用（ISBN 输入框自动填充）

```typescript
const handleIsbnChange = async (isbn: string) => {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  if (!IsbnService.isValidIsbn(cleanIsbn)) return;

  const bookInfo = await IsbnService.fetchByIsbn(cleanIsbn);
  if (bookInfo) {
    setFormData(prev => ({ ...prev, ...bookInfo, isbn: cleanIsbn }));
    toast.success('书籍信息已自动填充');
  }
};
```

## 📡 各数据源详情

### 1. NLC（国家图书馆 OPAC）

**接口地址**：`http://opac.nlc.cn/F`（两步协议）

**工作原理**：
1. 访问 `/F` 获取含动态 session token 的页面
2. 用动态 URL 发起 ISBN 查询，解析返回的 HTML 书目表格

**Vite 代理配置**（`vite.config.ts` 已配置，无需修改）：
```javascript
'/api/nlc': {
  target: 'http://opac.nlc.cn',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/nlc/, '/F'),
}
```

**支持字段**：书名、作者、出版社、出版年、页数、ISBN、内容提要

---

### 2. 豆瓣图书（网页抓取）

**接口地址**：`https://book.douban.com/isbn/{isbn}/`

**工作原理**：
- 访问 ISBN 页面（自动 301 重定向到书籍详情页）
- 从 HTML 中提取 og:meta、JSON-LD、#info div 等结构化数据

**支持字段**：书名、作者、出版社、出版年、页数、封面图、简介

**注意**：依赖豆瓣网页结构，若页面大改可能失效

---

### 3. Google Books

**接口地址**：`https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`

**国内访问**：需要代理（`googleapis.com` 在国内被屏蔽）

**支持字段**：书名、作者、出版社、出版年、页数、封面图、简介

---

### 4. OpenLibrary

**接口地址**：`https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`

**国内访问**：需要代理（`openlibrary.org` 在国内访问不稳定）

**支持字段**：书名、作者、出版社、出版年、页数、封面图、简介

## 🔧 API 配置管理

### 查看当前配置

```typescript
const configs = IsbnService.getApiConfigs();
configs.forEach(api => {
  console.log(`${api.name}: ${api.enabled ? '启用' : '禁用'} (优先级: ${api.priority})`);
});
```

### 禁用特定数据源

```typescript
// 仅使用豆瓣（NLC 无法访问时）
IsbnService.setApiConfig('NLC', false);

// 禁用所有国际数据源（纯国内环境）
IsbnService.setApiConfig('GoogleBooks', false);
IsbnService.setApiConfig('OpenLibrary', false);
```

### 调整优先级

```typescript
// 将豆瓣提升为第一优先级
IsbnService.setApiConfig('DoubanWeb', true, 1);
IsbnService.setApiConfig('NLC', true, 2);
```

## 🧪 测试 ISBN 列表

| ISBN | 书名 | 预期数据源 |
|------|------|-----------|
| 9787111544937 | 深入理解计算机系统（第3版） | NLC / 豆瓣 |
| 9787121396883 | Vue.js 设计与实现 | NLC / 豆瓣 |
| 9787544270365 | 解忧杂货店 | 豆瓣 |
| 9780306406157 | (英文书) | Google Books / OpenLibrary |

## 🔍 调试

浏览器控制台会输出完整的查询日志：

```
[ISBN] NLC API 环境: browser, baseUrl: /api/nlc
[ISBN] NLC Step 1: 获取动态 session URL...
[ISBN] NLC 动态 URL: /api/nlc/XXXXXXXXXXXX
[ISBN] NLC Step 2: 发起 ISBN 查询...
[ISBN] NLC 查询成功，开始解析书目 HTML...
[ISBN] NLC 解析结果: { title: '...', author: '...', ... }
✓ 从 NLC 成功获取书籍信息
```

## ❓ 常见问题

### Q: 查询不到某本书？

1. 检查 ISBN 格式是否正确（支持 ISBN-10 和 ISBN-13）
2. NLC 以中文书籍为主，英文书籍可能覆盖不全
3. 豆瓣覆盖更广，可尝试手动配置为第一优先级
4. 若仍无结果，请手动填写书籍信息

### Q: NLC 查询失败？

- 检查网络是否可访问 `opac.nlc.cn`
- Vite 开发服务器的 `/api/nlc` 代理是否正常工作
- 国家图书馆 OPAC 偶有维护，可稍后重试

### Q: 豆瓣查询慢或失败？

- 豆瓣有请求频率限制，批量查询时建议间隔 1-2 秒
- 若被限流（返回非正常页面），可暂时禁用后稍后重启

### Q: 页面封面图无法显示？

豆瓣封面图来自 `img1.doubanio.com`，可能需要特殊网络环境。
NLC 暂不提供封面图。建议实现图片加载失败的占位图：

```tsx
<img
  src={book.cover}
  onError={(e) => { e.currentTarget.src = '/placeholder-book.svg'; }}
  alt={book.title}
/>
```

## 📝 更新日志

- **v1.0** - 初始版本，支持 OpenLibrary 和豆瓣 API
- **v1.1** - 添加多数据源支持和优先级配置
- **v1.2** - 优化错误处理和日志输出
- **v1.3** - 新增 NLC（国家图书馆）和 Google Books 支持
- **v1.4** - 修复 NLC HTML 解析（字段名映射、多结果页处理、页数格式）；
           新增豆瓣网页抓取（替代已停用的豆瓣 v2 API）；
           调整优先级为：NLC > 豆瓣 > Google Books > OpenLibrary

---

**相关文件**：
- `src/services/isbn.ts` - ISBN 服务核心实现
- `vite.config.ts` - NLC OPAC 的 Vite 代理配置
- `ISBN_API_USAGE.md` - 组件使用示例
