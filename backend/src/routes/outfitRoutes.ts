import express from 'express'
import { database } from '../database/database'
import { ApiResponse, Outfit } from '../types'

const router = express.Router()

// GET /api/outfits - 获取所有服装列表
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const outfits = await database.getAllOutfits()
    
    const formattedOutfits: Outfit[] = outfits.map(outfit => ({
      id: outfit.id,
      name: '精选搭配', // Force uniform naming
      jacket: outfit.jacket_id,
      upper: outfit.upper_id,
      lower: outfit.lower_id,
      dress: outfit.dress_id,
      shoes: outfit.shoes_id,
      style: outfit.style,
      occasions: outfit.occasions.split(',').map((o: string) => o.trim())
    }))

    res.json({
      success: true,
      data: formattedOutfits
    } as ApiResponse<Outfit[]>)

  } catch (error) {
    console.error('❌ Error fetching outfits:', error)
    
    res.status(500).json({
      success: false,
      error: '获取服装列表失败'
    } as ApiResponse<null>)
  }
})

// GET /api/outfits/stats - 获取数据统计
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    const stats = await database.getStats()

    res.json({
      success: true,
      data: stats
    } as ApiResponse<any>)

  } catch (error) {
    console.error('❌ Error fetching stats:', error)
    
    res.status(500).json({
      success: false,
      error: '获取统计信息失败'
    } as ApiResponse<null>)
  }
})

// GET /api/outfits/search?q=query - 模糊搜索服装
router.get('/search', async (req: express.Request, res: express.Response) => {
  try {
    const query = req.query.q as string
    const limit = parseInt(req.query.limit as string) || 10

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词至少需要2个字符'
      } as ApiResponse<null>)
    }

    const outfits = await database.fuzzySearch(query.trim(), limit)
    
    const formattedOutfits: Outfit[] = outfits.map(outfit => ({
      id: outfit.id,
      name: '精选搭配', // Force uniform naming
      jacket: outfit.jacket_id,
      upper: outfit.upper_id,
      lower: outfit.lower_id,
      dress: outfit.dress_id,
      shoes: outfit.shoes_id,
      style: outfit.style,
      occasions: outfit.occasions.split(',').map((o: string) => o.trim())
    }))

    res.json({
      success: true,
      data: formattedOutfits
    } as ApiResponse<Outfit[]>)

  } catch (error) {
    console.error('❌ Error searching outfits:', error)
    
    res.status(500).json({
      success: false,
      error: '搜索失败'
    } as ApiResponse<null>)
  }
})

// GET /api/outfits/:id - 获取特定服装详情
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const id = parseInt(req.params.id)
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: '无效的服装ID'
      } as ApiResponse<null>)
    }

    const outfit = await database.getOutfitById(id)
    
    if (!outfit) {
      return res.status(404).json({
        success: false,
        error: '服装未找到'
      } as ApiResponse<null>)
    }

    const formattedOutfit: Outfit = {
      id: outfit.id,
      name: '精选搭配', // Force uniform naming
      jacket: outfit.jacket_id,
      upper: outfit.upper_id,
      lower: outfit.lower_id,
      dress: outfit.dress_id,
      shoes: outfit.shoes_id,
      style: outfit.style,
      occasions: outfit.occasions.split(',').map((o: string) => o.trim())
    }

    res.json({
      success: true,
      data: formattedOutfit
    } as ApiResponse<Outfit>)

  } catch (error) {
    console.error('❌ Error fetching outfit:', error)
    
    res.status(500).json({
      success: false,
      error: '获取服装详情失败'
    } as ApiResponse<null>)
  }
})

export default router
