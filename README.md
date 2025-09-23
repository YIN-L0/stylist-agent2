# AI时尚造型师 (Stylist Agent)

一个基于AI的智能时尚推荐系统，帮助用户根据不同场景需求获得个性化的服装搭配建议。

## 功能特色

-  **AI智能分析** - 使用OpenAI GPT分析用户场景描述
   **精准匹配** - 基于场合、风格、正式程度的多维度匹配算法
-  **个性化推荐** - 为每个场景推荐3套最适合的服装搭配
-  **现代化UI** - 响应式设计，支持各种设备
-  **可视化展示** - 美观的产品展示和链接跳转
-  **快速响应** - 优化的数据库查询和缓存机制

## 技术架构

### 前端 (Frontend)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **状态管理**: React Hooks
- **API调用**: Axios

### 后端 (Backend)
- **运行时**: Node.js
- **框架**: Express.js + TypeScript
- **数据库**: SQLite
- **AI集成**: OpenAI GPT API
- **数据处理**: CSV解析和导入

### 数据结构
- **服装数据**: 50套精选搭配
- **产品字段**: Jacket, Upper, Lower, Dress, Shoes
- **分类标签**: Style (风格) + Occasions (场合)

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd stylist_agent2
```

### 2. 安装依赖
```bash
# 安装所有依赖
npm run install:all
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env

# 编辑backend/.env，添加你的OpenAI API密钥
# OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 初始化数据库
```bash
# 设置数据库表结构并导入数据
npm run setup
```

### 5. 启动开发服务器
```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:3001
```

## 项目结构

```
stylist_agent2/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   ├── StylistAgent.tsx    # 主界面组件
│   │   │   ├── OutfitCard.tsx      # 推荐卡片组件
│   │   │   └── LoadingSpinner.tsx  # 加载动画组件
│   │   ├── services/        # API服务
│   │   └── index.css        # 样式文件
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Node.js后端API
│   ├── src/
│   │   ├── database/        # 数据库操作
│   │   ├── routes/          # API路由
│   │   ├── services/        # 业务逻辑
│   │   ├── scripts/         # 工具脚本
│   │   └── server.ts        # 主服务器文件
│   └── package.json
├── shared/                   # 共享类型定义
│   └── types.ts
├── data/                     # 数据文件
│   └── Women Outfit Detail, Style & Occasion - Sheet1.csv
└── README.md
```

## API接口

### 推荐接口
- **POST** `/api/recommend` - 获取服装推荐
  ```json
  {
    "scenario": "参加公司年会，需要正式但不过于隆重的着装"
  }
  ```

### 服装数据接口
- **GET** `/api/outfits` - 获取所有服装列表
- **GET** `/api/outfits/:id` - 获取特定服装详情
- **GET** `/api/outfits/stats` - 获取数据统计
- **GET** `/api/outfits/search?q=query` - 搜索服装

### 健康检查
- **GET** `/api/health` - 服务状态检查

## 使用示例

### 场景描述示例
- "参加公司年会，需要正式但不过于隆重的着装"
- "周末和朋友去咖啡厅聚会，舒适休闲的风格"
- "第一次和对方见面约会，想要时尚优雅"
- "出差商务晚宴，需要专业得体的穿搭"

### AI分析维度
- **场合匹配**: Office, Date Night, Casual, Party, etc.
- **风格匹配**: Classic, Chic, Casual, Smart Casual, Glam
- **正式程度**: casual, smart-casual, formal, glam
- **时间场景**: morning, afternoon, evening, night


```bash
# 根目录命令
npm run dev              # 启动前后端开发服务器
npm run build            # 构建前后端
npm run install:all      # 安装所有依赖
npm run setup            # 初始化数据库和数据

# 数据库命令
npm run db:setup         # 创建数据库表
npm run db:import        # 导入CSV数据
npm run db:reset         # 重置数据库

# 前端命令 (在frontend目录)
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果

# 后端命令 (在backend目录)
npm run dev              # 启动开发服务器
npm run build            # TypeScript编译
npm run start            # 启动生产服务器
```

## 数据统计

- **总搭配数**: 50套精选搭配
- **风格分布**: Casual(28), Chic(9), Smart Casual(7), Classic(3), Glam(3)
- **热门场合**: Weekend Brunch(33), Everyday Casual(30), Date Night(14)

## 注意事项

1. **OpenAI API密钥**: 确保在环境变量中正确配置
2. **端口配置**: 前端3000，后端3001
3. **数据导入**: 首次使用需运行数据导入脚本
4. **浏览器兼容**: 推荐使用现代浏览器

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 提交 Pull Request

## 许可证

MIT License

**让AI成为你的时尚顾问！**
