# LibraHub 开机自启动部署指南

## ✅ 准备工作（已完成）

项目已包含以下部署文件，均位于 `C:\Projects\kimi\LibraHub\app\` 目录：

| 文件 | 用途 |
|------|------|
| `dist/` | 已构建的静态文件（无需再构建） |
| `start-server.bat` | 启动 HTTP 服务器 |
| `LibraHub.vbs` | 开机自启动脚本 |
| `open-browser.bat` | 自动打开浏览器 |

---

## 🚀 一键部署步骤

### 步骤 1：复制启动脚本到启动文件夹

1. 按 **Win + R**，输入以下命令，回车：
   ```
   shell:startup
   ```

2. 将 `LibraHub.vbs` 文件**复制**到打开的启动文件夹中

### 步骤 2：验证部署

1. **手动测试**：双击 `start-server.bat`，确认浏览器能打开 `http://localhost:3000`
2. **重启电脑测试**：
   - 重启电脑
   - 等待约 15 秒
   - 浏览器会自动打开 `http://localhost:3000`

---

## 📋 部署文件说明

### start-server.bat
```batch
@echo off
chcp 65001 >nul
title LibraHub 本地服务器

cd /d %~dp0dist

REM 启动 HTTP 服务器,监听端口 3000
echo 服务器地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

python -m http.server 3000
pause
```

### LibraHub.vbs
```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c start /min """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-server.bat""", 0, False
```

这个 VBS 脚本会：
- 自动定位到项目目录
- 以最小化窗口启动 `start-server.bat`
- 服务器启动后自动打开浏览器访问 `http://localhost:3000`

---

## 🔧 常见问题

### Q1: 端口被占用
```cmd
netstat -ano | findstr :3000
```
找到占用的进程并结束，或修改 `start-server.bat` 中的端口号（如改为 8080）

### Q2: Python 未找到
确保 Python 已安装并添加到 PATH，或修改 `start-server.bat` 使用完整路径：
```batch
C:\Python39\python.exe -m http.server 3000
```

### Q3: 启动失败
检查任务计划程序的事件查看器或手动运行脚本排查错误

---

## 📱 访问方式

| 设备 | 访问地址 |
|------|----------|
| 本机 | `http://localhost:3000` |
| 局域网其他设备 | `http://<电脑IP>:3000` |

如需局域网访问，修改 `start-server.bat`：
```batch
python -m http.server 3000 --bind 0.0.0.0
```

---

## 🛑 停止服务

1. 在运行窗口（托盘区）找到 "LibraHub 本地服务器"
2. 右键 → 关闭窗口，或按 Ctrl+C

---

## 🔄 更新部署

如果更新了项目代码：
```cmd
cd C:\Projects\kimi\LibraHub\app
npm run build
```
构建完成后，新版本会在下次启动时自动生效。

---

**部署完成后，你的电脑每次重启都会自动启动 LibraHub，无需任何操作即可访问 `http://localhost:3000`！**
