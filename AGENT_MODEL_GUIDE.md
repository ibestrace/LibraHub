# OpenCode 子代理模型配置指南

## ⚠️ 重要发现

`categoryModels` 配置**不生效**！OpenCode 平台强制绑定 category 到特定模型：

| Category | 强制模型 | 你的账户权限 |
|----------|---------|-------------|
| `deep` | `gpt-5.3-codex` | ❌ 无权限 |
| `visual-engineering` | `gpt-4`/`claude` | ❌ 无权限 |
| `ultrabrain` | `o1`/`gpt-5` | ❌ 无权限 |
| `artistry` | `claude-3.5` | ❌ 无权限 |

## ✅ 正确的解决方案

### 方法1: 不使用 `category` 参数（推荐）

```typescript
// ❌ 错误：会强制切换模型
task(category="visual-engineering", ...)
task(category="ultrabrain", ...)

// ✅ 正确：使用 subagent_type，保持当前模型
task(subagent_type="Sisyphus-Junior", ...)
task(subagent_type="explore", ...)
task(subagent_type="librarian", ...)
task(subagent_type="oracle", ...)
task(subagent_type="plan", ...)
```

### 方法2: 仅使用 `quick` 类别

```typescript
// ✅ safe: quick 类别可能使用默认模型
task(category="quick", ...)
```

### 方法3: 单代理模式

如果必须使用多代理，建议**禁用 ultraworker 模式**，改为顺序执行：

```typescript
// 不使用 run_in_background=true
// 改为同步执行
const result1 = await task({...}, run_in_background=false)
const result2 = await task({...}, run_in_background=false)
```

## 📝 更新后的使用规范

在 ultraworker 模式下，**永远不要**使用以下 category：
- ❌ `visual-engineering`
- ❌ `ultrabrain`
- ❌ `deep`
- ❌ `artistry`
- ❌ `unspecified-high`
- ❌ `writing`

**可以使用的 subagent_type：**
- ✅ `Sisyphus-Junior` (通用子代理)
- ✅ `explore` (代码探索)
- ✅ `librarian` (文档查询)
- ✅ `oracle` (架构咨询)
- ✅ `plan` (任务规划)

## 🔧 配置文件保留

虽然 `categoryModels` 不生效，但保留配置以便将来平台支持：

```json
{
  "model": "kimi-for-coding/k2p5",
  "defaultModel": "kimi-for-coding/k2p5"
}
```

## 📋 总结

| 场景 | 推荐做法 |
|------|---------|
| 视觉/UI 任务 | `task(subagent_type="Sisyphus-Junior", load_skills=["frontend-design"])` |
| 复杂逻辑 | `task(subagent_type="oracle", ...)` |
| 代码探索 | `task(subagent_type="explore", ...)` |
| 快速修复 | `task(category="quick", ...)` |

**核心原则：避免使用会触发模型切换的 category！**
