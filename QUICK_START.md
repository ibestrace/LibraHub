# LibraHub 快速启动指南

## 🚀 一键启动

### 方式 1: 开发模式(推荐)

```bash
npm run dev
```

启动后在浏览器打开: http://localhost:5173

### 方式 2: 预览构建版本

```bash
npm run build
npm run preview
```

启动后在浏览器打开: http://localhost:4173

---

## 📋 完整启动步骤

### 首次使用

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

### 日常使用

```bash
# 直接启动
npm run dev
```

---

## 🎯 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器(热更新) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建版本 |
| `npm run test:run` | 运行单元测试 |
| `npm run test:all` | 完整测试流程 |

---

## 📖 功能导航

启动后,你可以使用以下功能:

### 1. **仪表板**
- 查看系统概览
- 统计数据分析
- 快捷操作入口

### 2. **书籍管理**
- 添加/编辑/删除书籍
- 条形码扫描录入
- ISBN 自动填充
- 搜索和筛选

### 3. **借还管理**
- 借书登记
- 还书处理
- 借阅历史查询

### 4. **会员管理**
- 添加/编辑会员信息
- 会员借阅记录
- 会员统计

### 5. **数据管理**
- 数据导入/导出
- 数据备份/恢复
- 清空数据

---

## 🔧 快速测试

### 测试启动是否成功

1. 启动开发服务器:
   ```bash
   npm run dev
   ```

2. 打开浏览器访问: http://localhost:5173

3. 看到 LibraHub 欢迎页面即表示启动成功

### 测试核心功能

#### 测试 1: 添加书籍

1. 点击侧边栏「书籍管理」
2. 点击「添加书籍」按钮
3. 填写表单:
   - 条形码: `1234567890`
   - 书名: `测试书籍`
   - 作者: `测试作者`
4. 点击「确认添加」
5. 应该看到「书籍添加成功」提示

#### 测试 2: ISBN 自动填充

1. 添加新书时,输入 ISBN: `9787111544937`
2. 失去焦点后自动获取书籍信息
3. 看到书名、作者等信息自动填充

#### 测试 3: 扫码录入

1. 在书籍管理页面点击「扫码录入」
2. 如果有扫码枪,扫描书籍条形码
3. 或手动输入条形码并按回车
4. 自动打开添加/编辑弹窗

---

## ⚡ 常见问题

### Q1: 端口被占用怎么办?

```bash
# 方式 1: 关闭占用端口的进程
# Windows
netstat -ano | findstr :5173
taskkill /PID <进程ID> /F

# 方式 2: 修改端口
# 在 vite.config.ts 中添加:
# server: { port: 3000 }
```

### Q2: 依赖安装失败?

```bash
# 清理缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

### Q3: 构建失败?

```bash
# 检查 TypeScript 错误
npx tsc --noEmit

# 检查 ESLint 错误
npm run lint
```

---

## 📚 详细文档

- [本地部署指南](DEPLOYMENT_LOCAL.md) - 开机自启动配置
- [测试部署指南](TEST_DEPLOYMENT.md) - 测试环境配置
- [OpenLibrary 配置](OPENLIBRARY_CONFIG.md) - API 配置
- [完整 README](README.md) - 项目详情

---

## 🎉 开始使用

现在就启动你的 LibraHub 图书管理系统吧!

```bash
npm run dev
```

然后在浏览器打开: http://localhost:5173

祝你使用愉快! 📚
