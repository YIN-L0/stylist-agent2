import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { database, menDatabase } from './database/database'
import { importData } from './scripts/importData'

// 配置环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3002', // 添加3002端口支持
    'https://stylist-agent3.vercel.app', // 主域名
    /^https:\/\/stylist-agent3-.*\.vercel\.app$/, // 所有 stylist-agent3 预览域名
    /^https:\/\/stylist-agent2-.*\.vercel\.app$/, // 兼容旧的 stylist-agent2 域名
  ],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 数据库初始化
async function initializeDatabase() {
  try {
         console.log('Initializing databases...')
    await database.initializeTables()
    await menDatabase.initializeTables()
    
    // 检查是否已有数据
    const womenStats = await database.getStats()
    const menStats = await menDatabase.getStats()
    
    if (womenStats.total === 0) {
         console.log('No women data found, importing from CSV...')
      process.env.IMPORT_GENDER = 'women'
      process.env.IMPORT_TARGET_DB = 'women'
      await importData()
    } else {
      console.log(`Women database ready with ${womenStats.total} outfits`)
    }
    
    if (menStats.total === 0) {
         console.log('No men data found, importing from CSV...')
      process.env.IMPORT_GENDER = 'men'
      process.env.IMPORT_TARGET_DB = 'men'
      await importData()
    } else {
      console.log(`Men database ready with ${menStats.total} outfits`)
    }
  } catch (error) {
    console.error('Database initialization failed:', error)
    // 不退出，让服务器继续运行，但记录错误
  }
}

// 路由
app.get('/api/health', async (req, res) => {
  try {
    // 检查数据库状态
    let dbStatus = 'unknown'
    let womenCount = 0
    let menCount = 0
    
    try {
      const womenStats = await database.getStats()
      const menStats = await menDatabase.getStats()
      womenCount = womenStats.total
      menCount = menStats.total
      dbStatus = 'connected'
    } catch (error) {
      dbStatus = 'error'
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Stylist Agent API is running',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        womenOutfits: womenCount,
        menOutfits: menCount
      },
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 路由导入
import recommendRoutes from './routes/recommendRoutes'
import outfitRoutes from './routes/outfitRoutes'
import virtualTryOnRoutes from './routes/virtualTryOnRoutes'

// 路由设置
app.use('/api/recommend', recommendRoutes)
app.use('/api/outfits', outfitRoutes)
app.use('/api/virtual-tryon', virtualTryOnRoutes)

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

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - Updated for 9 recommendations`)
  console.log(`API Documentation: http://localhost:${PORT}/api/health`)
})

// 异步初始化数据库，不阻塞服务器启动
initializeDatabase()
  .then(() => {
    console.log('Database initialization completed')
  })
  .catch((error) => {
    console.error('Database initialization failed:', error)
    // 不退出进程，让健康检查仍然可以工作
  })

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
  })
})
