# 快速测试设置指南

## 🚀 一键运行测试

### Windows 用户

```bash
# 完整测试(推荐)
npm run test:all

# 快速测试(单元测试 + 构建)
npm run test:quick

# 仅 E2E 测试
npm run test:e2e

# 仅单元测试
npm run test:run

# 查看测试覆盖率
npm run test:coverage
```

### macOS/Linux 用户

```bash
# 使用脚本(需要先添加执行权限)
chmod +x scripts/*.sh

# 完整测试
./scripts/test-all.sh

# 快速测试
./scripts/test-quick.sh
```

## 📋 测试清单

### 首次设置

- [ ] 安装依赖: `npm install`
- [ ] 安装 Playwright 浏览器: `npx playwright install`
- [ ] 验证测试环境: `npm test -- --version`

### 日常开发

- [ ] 单元测试: `npm run test:run`
- [ ] E2E 测试: `npm run test:e2e`
- [ ] 覆盖率报告: `npm run test:coverage`
- [ ] 完整测试: `npm run test:all`

### 代码提交前

- [ ] 代码检查: `npm run lint`
- [ ] 类型检查: `npx tsc --noEmit`
- [ ] 单元测试: `npm run test:run`
- [ ] 构建验证: `npm run build`

## 🎯 测试脚本说明

| 脚本 | 说明 | 使用场景 |
|------|------|----------|
| `test:all` | 完整测试流程 | 提交前、发布前 |
| `test:quick` | 快速测试 | 日常开发 |
| `test:e2e` | E2E 测试 | 验证用户流程 |
| `test:run` | 单元测试 | 验证核心功能 |
| `test:coverage` | 覆盖率报告 | 检查测试覆盖 |
| `test:watch` | 监听模式 | 开发时实时测试 |

## 🔧 故障排查

### 问题: 测试失败

```bash
# 清理缓存重新测试
rm -rf node_modules .vitest coverage
npm install
npm run test:run
```

### 问题: E2E 测试失败

```bash
# 重新安装 Playwright 浏览器
npx playwright install --with-deps

# 检查端口占用
netstat -ano | findstr :5173
```

### 问题: 覆盖率报告无法打开

```bash
# 手动打开覆盖率报告
# Windows: start coverage/index.html
# macOS: open coverage/index.html
# Linux: xdg-open coverage/index.html
```

## 📚 详细文档

- [完整测试部署指南](TEST_DEPLOYMENT.md)
- [本地部署指南](DEPLOYMENT_LOCAL.md)
- [项目 README](README.md)

---

**提示**: 保持测试通过再提交代码! 🎯
