@echo off
REM 等待 10 秒让服务器启动
timeout /t 10 /nobreak >nul
REM 自动打开浏览器访问系统
start http://localhost:3000
