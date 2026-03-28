@echo off
chcp 65001 >nul
title LibraHub 本地服务器

echo ========================================
echo      LibraHub 智能图书管理系统
echo ========================================
echo 正在启动服务器...
echo.

cd /d %~dp0

REM 启动 Vite 开发服务器,监听端口 3000
echo 服务器地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

npm run dev -- --port 3000 --host

pause
