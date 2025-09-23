import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

// 配置环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`)
})
