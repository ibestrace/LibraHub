# LibraHub 本地部署指南 (Windows)

本指南帮助你将 LibraHub 部署到本地 Windows 电脑,实现开机后无需任何操作即可直接访问页面。

## 📋 部署概述

- **项目**: LibraHub - 智能图书管理系统
- **技术栈**: React + Vite + TypeScript
- **部署方式**: 使用 Python HTTP 服务器托管静态文件
- **启动方式**: Windows 任务计划程序开机自动启动

## 🚀 快速部署步骤

### 一、环境准备

#### 1. 安装 Node.js (如需重新构建)

- 下载 Node.js: https://nodejs.org/
- 推荐版本: Node.js 18.x 或更高版本
- 安装时勾选 "Add to PATH"

#### 2. 验证 Python 环境

Windows 自带 Python 或需要安装:
- 下载 Python: https://www.python.org/downloads/
- 安装时勾选 "Add Python to PATH"
- 验证安装:
  ```cmd
  python --version
  ```
  应显示 Python 3.6 或更高版本

### 二、获取项目文件

#### 选项 A: 从 Git 仓库克隆 (推荐)

```cmd
cd C:\
git clone <你的仓库地址> LibraHub
cd LibraHub\app
```

#### 选项 B: 使用现有文件

- 将整个项目文件夹复制到 `C:\LibraHub\app`
- 确保包含 `dist` 文件夹及其所有内容

### 三、准备静态文件

#### 如果已有 dist 文件夹,跳过此步骤

```cmd
npm install
npm run build
```

构建完成后,`dist` 文件夹包含所有必要的静态文件。

#### 验证 dist 文件夹内容

```
dist/
├── assets/           # 静态资源
├── favicon.svg       # 图标
├── index.html        # 入口文件
├── logo-icon.svg
├── logo.svg
└── test-data.js
```

### 四、创建启动脚本

在 `C:\LibraHub\app` 目录下创建 `start-server.bat` 文件:

```batch
@echo off
chcp 65001 >nul
title LibraHub 本地服务器

echo ========================================
echo      LibraHub 智能图书管理系统
echo ========================================
echo 正在启动服务器...
echo.

cd /d C:\LibraHub\app\dist

REM 启动 HTTP 服务器,监听端口 3000
echo 服务器地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

python -m http.server 3000

pause
```

#### 手动测试启动

双击 `start-server.bat` 文件,测试服务器是否正常启动:
- 打开浏览器访问: `http://localhost:3000`
- 确认可以正常使用图书管理系统
- 按 `Ctrl+C` 停止服务器

### 五、设置开机自启动

#### 方法 1: 使用任务计划程序 (推荐)

**步骤:**

1. **打开任务计划程序**
   - 按 `Win + R`,输入 `taskschd.msc`,回车
   - 或: 控制面板 → 管理工具 → 任务计划程序

2. **创建基本任务**
   - 右侧点击"创建基本任务"
   - 名称: `LibraHub 自动启动`
   - 描述: `开机自动启动 LibraHub 图书管理系统`
   - 点击"下一步"

3. **设置触发器**
   - 选择: `当计算机启动时`
   - 点击"下一步"

4. **设置操作**
   - 选择: `启动程序`
   - 点击"下一步"

5. **配置程序**
   - 程序或脚本: `cmd.exe`
   - 添加参数(引号内):
     ```
     /c start /min "LibraHub" C:\LibraHub\app\start-server.bat
     ```
   - 起始于(可选): `C:\LibraHub\app`
   - 点击"下一步"

6. **完成设置**
   - 勾选: `当单击完成时,打开此任务属性的对话框`
   - 点击"完成"

7. **配置高级选项**
   - 切换到"常规"标签
   - ✅ 勾选: `使用最高权限运行`
   - ✅ 勾选: `不管用户是否登录都要运行`
   - 配置为: `Windows 10`

   - 切换到"条件"标签
   - ❌ 取消勾选: `只有在计算机使用交流电源时才启动此任务`(如果是笔记本)

   - 切换到"设置"标签
   - ✅ 勾选: `如果任务失败,按以下频率重新启动: 1 分钟`
   - 尝试重新启动次数: `3`

8. **保存设置**
   - 点击"确定"
   - 输入管理员密码(如需要)

#### 方法 2: 使用启动文件夹 (简单)

1. 按 `Win + R`,输入以下路径,回车:
   ```
   shell:startup
   ```

2. 在打开的启动文件夹中,创建 `LibraHub.vbs` 文件:

```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c start /min C:\LibraHub\app\start-server.bat", 0, False
```

3. 保存文件,重启电脑测试

#### 方法 3: 使用注册表 (高级)

⚠️ **注意**: 修改注册表有风险,请谨慎操作

1. 按 `Win + R`,输入 `regedit`,回车
2. 定位到:
   ```
   HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
   ```
3. 右侧空白处 → 新建 → 字符串值
4. 名称: `LibraHub`
5. 值: `cmd /c start /min C:\LibraHub\app\start-server.bat`

### 六、配置系统服务 (可选 - 专业方案)

如果希望以后台服务形式运行(无窗口),使用 NSSM (Non-Sucking Service Manager):

#### 安装 NSSM

1. 下载 NSSM: https://nssm.cc/download
2. 解压到 `C:\nssm`
3. 以管理员身份运行 CMD:
   ```cmd
   cd C:\nssm\win64
   nssm install LibraHub
   ```

#### 配置服务

1. 在弹出的窗口中配置:
   - **Path**: `python.exe` (找到你的 Python 安装路径)
   - **Startup directory**: `C:\LibraHub\app\dist`
   - **Arguments**: `-m http.server 3000`

2. 切换到"Details"标签:
   - Display name: `LibraHub 服务`
   - Description: `LibraHub 智能图书管理系统 HTTP 服务`

3. 点击"Install service"

4. 启动服务:
   ```cmd
   nssm start LibraHub
   ```

5. 设置开机自启动:
   - 服务管理器 (`services.msc`)
   - 找到 `LibraHub 服务`
   - 设置启动类型为 `自动`

### 七、设置浏览器自动打开 (可选)

创建 `open-browser.bat`:

```batch
@echo off
timeout /t 10 /nobreak >nul
start http://localhost:3000
```

修改 `start-server.bat`,在最后一行前添加:
```batch
start /min cmd /c C:\LibraHub\app\open-browser.bat
```

### 八、验证部署

#### 重启电脑测试

1. 重启电脑
2. 等待约 10-15 秒
3. 打开浏览器,访问: `http://localhost:3000`
4. 验证系统功能是否正常

#### 检查服务状态

**任务计划程序:**
```
任务计划程序 → 任务计划程序库
→ 找到 "LibraHub 自动启动"
→ 查看右侧"上次运行结果"和"下次运行时间"
```

**系统服务 (如果使用 NSSM):**
```
Win + R → services.msc
→ 找到 "LibraHub 服务"
→ 确认状态为"正在运行"
```

## 🔧 常见问题排查

### 问题 1: 端口被占用

**症状**: 启动失败,提示端口已被使用

**解决方案**:
```cmd
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程 (将 PID 替换为实际值)
taskkill /PID <进程ID> /F
```

或修改 `start-server.bat` 中的端口号:
```batch
python -m http.server 8080
```

### 问题 2: Python 未安装或未添加到 PATH

**症状**: 运行脚本时提示 "python 不是内部或外部命令"

**解决方案**:
1. 重新安装 Python,确保勾选 "Add Python to PATH"
2. 或使用完整路径:
   ```batch
   C:\Python39\python.exe -m http.server 3000
   ```

### 问题 3: 浏览器无法访问

**检查项**:
- ✅ 服务器是否已启动(查看 CMD 窗口)
- ✅ 防火墙是否阻止(添加允许规则)
- ✅ 访问的 URL 是否正确: `http://localhost:3000`

**防火墙设置**:
1. 控制面板 → Windows Defender 防火墙 → 高级设置
2. 入站规则 → 新建规则
3. 选择"端口" → TCP → 特定本地端口: 3000
4. 允许连接 → 全部勾选 → 名称: LibraHub

### 问题 4: 任务计划程序未自动运行

**排查**:
1. 打开任务计划程序
2. 找到 "LibraHub 自动启动"
3. 查看右侧"历史记录"标签,查看错误信息
4. 手动右键点击 → 运行,测试是否能正常启动

### 问题 5: 更新项目后不生效

**解决方案**:
```cmd
cd C:\LibraHub\app
npm run build
# 重启服务器
```

## 📊 目录结构建议

```
C:\LibraHub\
├── app\                     # 项目根目录
│   ├── dist\               # 部署文件夹
│   ├── node_modules\       # 依赖
│   ├── src\                # 源代码
│   ├── start-server.bat    # 启动脚本
│   └── package.json
└── README.md              # 本指南
```

## 🔐 安全建议

1. **仅局域网访问**: 当前配置仅本机访问(localhost)
2. **局域网访问**: 如需其他设备访问,修改 `start-server.bat`:
   ```batch
   python -m http.server 3000 --bind 0.0.0.0
   ```
   然后使用 `http://<电脑IP>:3000` 访问
3. **数据备份**: 定期备份 `dist` 文件夹和任何数据存储文件
4. **防病毒**: 保持系统和杀毒软件更新

## 📝 维护命令

```cmd
# 停止服务器
# 在运行服务器的 CMD 窗口按 Ctrl+C

# 重启服务器
# 关闭服务器窗口 → 双击 start-server.bat

# 更新项目
cd C:\LibraHub\app
git pull origin main
npm run build

# 查看日志
# 查看服务器 CMD 窗口输出

# 禁用开机自启动
# 方法1: 任务计划程序中禁用任务
# 方法2: 从启动文件夹删除 VBS 文件
# 方法3: 删除注册表项
```

## 🎯 快速命令参考

| 操作 | 命令 |
|------|------|
| 打开任务计划程序 | `taskschd.msc` |
| 打开服务管理器 | `services.msc` |
| 打开注册表 | `regedit` |
| 打开启动文件夹 | `shell:startup` |
| 查找端口占用 | `netstat -ano \| findstr :3000` |
| 结束进程 | `taskkill /PID <ID> /F` |

## 📞 技术支持

如有问题,请检查:
1. 本文档的"常见问题排查"部分
2. 项目仓库的 Issues
3. Vite 官方文档: https://vite.dev/

---

**部署完成后,你将拥有:**
✅ 开机自动启动的图书管理系统
✅ 无需任何操作即可使用
✅ 稳定可靠的本地服务

**祝你使用愉快!** 🎉
