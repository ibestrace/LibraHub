# LibraHub 本地部署指南

## 1. 前置条件

在部署 LibraHub 之前，您需要确保本地电脑上安装了以下软件：

### 1.1 Node.js

LibraHub 使用 Node.js 作为运行环境，您需要安装 Node.js 18.0 或更高版本。

**下载安装 Node.js：**
- 访问 [Node.js 官网](https://nodejs.org/)
- 下载并安装适合您操作系统的 LTS 版本
- 验证安装成功：
  ```bash
  node -v
  npm -v
  ```

### 1.2 Git（可选）

如果您需要通过 Git 克隆项目仓库，则需要安装 Git：

- 访问 [Git 官网](https://git-scm.com/)
- 下载并安装适合您操作系统的版本
- 验证安装成功：
  ```bash
  git --version
  ```

## 2. 获取项目代码

### 2.1 通过 Git 克隆（推荐）

如果您有 Git 环境，可以直接克隆项目仓库：

```bash
git clone <项目仓库地址>
cd LibraHub/app
```

### 2.2 直接下载

如果您没有 Git 环境，可以直接下载项目代码：

1. 从项目仓库下载 ZIP 文件
2. 解压到本地目录
3. 进入 `LibraHub/app` 目录

## 3. 安装依赖

在项目目录中，运行以下命令安装项目依赖：

```bash
npm install
```

## 4. 开发环境运行

如果您需要在开发环境中运行项目（用于开发和测试），可以使用以下命令：

```bash
npm run dev
```

运行成功后，您可以通过浏览器访问以下地址：
- **本地访问**：http://localhost:5173/

## 5. 生产环境构建

如果您需要构建生产版本（用于部署），可以使用以下命令：

```bash
npm run build
```

构建成功后，会在 `dist` 目录中生成生产版本的静态文件。

## 6. 本地部署生产版本

### 6.1 使用本地服务器

您可以使用任何静态文件服务器来部署 `dist` 目录中的文件。以下是几种常见的方法：

#### 6.1.1 使用 Python 内置服务器

如果您的系统上安装了 Python，可以使用其内置的 HTTP 服务器：

```bash
# Python 3
cd dist
python -m http.server 8080

# Python 2
cd dist
python -m SimpleHTTPServer 8080
```

然后通过浏览器访问：http://localhost:8080/

#### 6.1.2 使用 Node.js 服务器

您可以使用 `http-server` 包来启动一个简单的 HTTP 服务器：

```bash
# 全局安装 http-server
npm install -g http-server

# 启动服务器
cd dist
http-server -p 8080
```

然后通过浏览器访问：http://localhost:8080/

#### 6.1.3 使用 Vite 预览

您也可以使用 Vite 自带的预览功能来预览生产构建：

```bash
npm run preview
```

然后通过浏览器访问：http://localhost:4173/

### 6.2 部署到本地 Web 服务器

如果您有本地 Web 服务器（如 Apache、Nginx），可以将 `dist` 目录中的文件复制到 Web 服务器的根目录或子目录中：

#### 6.2.1 Apache 部署

1. 将 `dist` 目录中的所有文件复制到 Apache 的 `htdocs` 目录或其子目录
2. 启动 Apache 服务器
3. 通过浏览器访问：http://localhost/（或相应的子目录路径）

#### 6.2.2 Nginx 部署

1. 编辑 Nginx 配置文件，添加以下配置：
   ```nginx
   server {
     listen 80;
     server_name localhost;
     root /path/to/librahub/dist;
     index index.html;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```
2. 重新加载 Nginx 配置
3. 通过浏览器访问：http://localhost/

## 7. 数据存储说明

LibraHub 使用浏览器的 LocalStorage 作为数据存储方案：

- **数据位置**：存储在浏览器的 LocalStorage 中
- **存储限制**：约 5-10MB（因浏览器而异）
- **数据备份**：建议定期使用系统的数据备份功能导出数据
- **数据恢复**：可以通过系统的数据恢复功能导入备份数据

## 8. 常见问题与解决方案

### 8.1 依赖安装失败

**问题**：运行 `npm install` 时失败

**解决方案**：
- 检查网络连接
- 清除 npm 缓存：`npm cache clean --force`
- 使用 npm 镜像：`npm install --registry=https://registry.npmmirror.com`

### 8.2 开发服务器启动失败

**问题**：运行 `npm run dev` 时失败，提示端口被占用

**解决方案**：
- 关闭占用端口的其他进程
- 或使用不同的端口启动：`npm run dev -- --port 3000`

### 8.3 生产构建失败

**问题**：运行 `npm run build` 时失败

**解决方案**：
- 确保依赖安装成功
- 检查 TypeScript 类型错误
- 运行 `npm run lint` 检查代码规范问题

### 8.4 部署后页面空白

**问题**：部署到本地服务器后，页面显示空白

**解决方案**：
- 检查服务器配置，确保正确处理 SPA 路由
- 确保所有静态文件都已正确复制
- 检查浏览器控制台是否有错误信息

### 8.5 数据丢失

**问题**：浏览器清除缓存后，数据丢失

**解决方案**：
- 定期使用系统的数据备份功能导出数据
- 重要数据建议多备份几份

## 9. 系统要求

### 9.1 硬件要求

- **CPU**：至少 1GHz 处理器
- **内存**：至少 2GB RAM
- **存储空间**：至少 100MB 可用空间

### 9.2 软件要求

- **操作系统**：Windows、macOS、Linux
- **浏览器**：Chrome 80+、Firefox 75+、Safari 13+、Edge 80+
- **Node.js**：18.0+（仅开发和构建时需要）

## 10. 后续维护

### 10.1 定期备份数据

建议定期使用系统的数据备份功能导出数据，以防止数据丢失。

### 10.2 更新依赖

定期更新项目依赖，以获取安全补丁和性能改进：

```bash
npm update
```

### 10.3 代码更新

如果项目代码有更新，可以通过以下步骤更新：

1. 拉取最新代码：`git pull`（如果使用 Git）
2. 安装新依赖：`npm install`
3. 构建生产版本：`npm run build`
4. 重新部署

## 11. 技术支持

如果您在部署过程中遇到任何问题，可以：

1. 检查项目的 `README.md` 文件
2. 查看浏览器控制台的错误信息
3. 联系项目开发团队获取支持

---

**部署完成后，您就可以开始使用 LibraHub 管理您的图书馆了！**