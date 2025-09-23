import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { database } from './database/database'
import { importData } from './scripts/importData'

// 配置环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'https://stylist-agent2.vercel.app',
    'https://stylist-agent2-git-main.vercel.app'
  ],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 数据库初始化
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...')
    await database.initializeTables()
    
    // 检查是否已有数据
    const stats = await database.getStats()
    if (stats.total === 0) {
      console.log('📥 No data found, importing from CSV...')
      await importData()
    } else {
      console.log(`✅ Database ready with ${stats.total} outfits`)
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    // 不退出，让服务器继续运行，但记录错误
  }
}

// 路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Stylist Agent API is running',
    timestamp: new Date().toISOString()
  })
})

// 路由导入
import recommendRoutes from './routes/recommendRoutes'
import outfitRoutes from './routes/outfitRoutes'

// 路由设置
app.use('/api/recommend', recommendRoutes)
app.use('/api/outfits', outfitRoutes)

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error' 
  })
})

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  })
})

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`)
  
  // 初始化数据库
  await initializeDatabase()
})
