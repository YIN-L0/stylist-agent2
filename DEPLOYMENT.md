# 🚀 AI时尚造型师 - 部署指南

## 📋 部署概览

本项目包含前端和后端两个部分，需要分别部署：

- **前端**: React + Vite + Tailwind CSS → 部署到 Vercel
- **后端**: Node.js + Express + SQLite → 部署到 Railway

## 🌐 部署步骤

### 1. 后端部署 (Railway)

1. **注册 Railway 账号**
   - 访问 [railway.app](https://railway.app)
   - 使用 GitHub 账号登录

2. **连接 GitHub 仓库**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 `stylist_agent2` 仓库

3. **配置环境变量**
   在 Railway 项目设置中添加以下环境变量：
   ```
   NODE_ENV=production
   PORT=3001
   OPENAI_API_KEY=你的OpenAI_API密钥
   DATABASE_PATH=./database.sqlite
   PRODUCT_BASE_URL=https://example.com/products
   PRODUCT_IMAGE_BASE_URL=https://maistyle01.oss-cn-shanghai.aliyuncs.com/rare
   CORS_ORIGIN=https://你的前端域名.vercel.app
   ```

4. **部署设置**
   - Railway 会自动检测到 `railway.toml` 配置
   - 构建命令: `cd backend && npm install && npm run build`
   - 启动命令: `cd backend && npm start`

### 2. 前端部署 (Vercel)

1. **注册 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择你的 `stylist_agent2` 仓库
   - 选择 "frontend" 文件夹作为根目录

3. **配置环境变量**
   在 Vercel 项目设置中添加：
   ```
   VITE_API_URL=https://你的后端域名.railway.app
   ```

4. **构建设置**
   - 构建命令: `npm run build`
   - 输出目录: `dist`
   - 安装命令: `npm install`

### 3. 更新 CORS 配置

部署完成后，需要更新后端的 CORS 配置：

1. 在 Railway 项目设置中更新 `CORS_ORIGIN` 环境变量
2. 设置为你的 Vercel 前端域名

## 🔧 本地开发

```bash
# 安装依赖
npm run install:all

# 启动开发服务器
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:3001
```

## 📁 项目结构

```
stylist_agent2/
├── frontend/          # React 前端
├── backend/           # Node.js 后端
├── shared/            # 共享类型定义
├── data/              # CSV 数据文件
├── vercel.json        # Vercel 配置
├── railway.toml       # Railway 配置
└── README.md
```

## 🌍 访问地址

部署完成后，你将获得：

- **前端**: `https://你的项目名.vercel.app`
- **后端**: `https://你的项目名.railway.app`

## 🔐 环境变量说明

### 后端环境变量
- `OPENAI_API_KEY`: OpenAI API 密钥
- `DATABASE_PATH`: SQLite 数据库路径
- `CORS_ORIGIN`: 允许的前端域名

### 前端环境变量
- `VITE_API_URL`: 后端 API 地址

## 🚨 注意事项

1. **OpenAI API 配额**: 确保 OpenAI API 有足够的配额
2. **数据库**: Railway 使用临时存储，重启后数据会丢失
3. **CORS**: 确保前后端域名配置正确
4. **HTTPS**: 生产环境必须使用 HTTPS

## 🆘 故障排除

### 常见问题

1. **CORS 错误**
   - 检查 `CORS_ORIGIN` 环境变量
   - 确保前端域名正确

2. **API 连接失败**
   - 检查 `VITE_API_URL` 环境变量
   - 确保后端服务正常运行

3. **OpenAI API 错误**
   - 检查 API 密钥是否正确
   - 确认 API 配额是否充足

## 📞 支持

如果遇到部署问题，请检查：
1. 环境变量配置
2. 网络连接
3. 服务状态
4. 日志信息
