import express from 'express'
import { virtualTryOnService } from '../services/virtualTryOnService'
import { ApiResponse } from '../types'

const router = express.Router()

// POST /api/virtual-tryon - 为指定搭配生成虚拟试穿
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { outfitId, items } = req.body

    if (!outfitId || !items) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：outfitId 和 items'
      } as ApiResponse<null>)
    }

    console.log(`Generating virtual try-on for outfit: ${outfitId}`)

    // 检查是否配置了FASHN API
    if (!virtualTryOnService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: '虚拟试穿服务未配置'
      } as ApiResponse<null>)
    }

    let virtualTryOnResult

    // 情况1：有连衣裙
    if (items.dress) {
      console.log('👗 Trying on dress:', items.dress.imageUrl)
      const tryOnUrl = await virtualTryOnService.generateTryOn(items.dress.imageUrl, 'one-pieces')
      virtualTryOnResult = {
        imageUrl: tryOnUrl,
        status: 'completed' as const
      }
    }
    // 情况2：有上装和下装
    else if (items.upper && items.lower) {
      console.log('👕👖 Trying on upper + lower:', items.upper.imageUrl, items.lower.imageUrl)
      const tryOnUrl = await virtualTryOnService.generateUpperLowerTryOn(
        items.upper.imageUrl,
        items.lower.imageUrl
      )
      virtualTryOnResult = {
        imageUrl: tryOnUrl,
        status: 'completed' as const
      }
    }
    // 情况3：只有上装
    else if (items.upper) {
      console.log('👕 Trying on upper only:', items.upper.imageUrl)
      const tryOnUrl = await virtualTryOnService.generateTryOn(items.upper.imageUrl, 'tops')
      virtualTryOnResult = {
        imageUrl: tryOnUrl,
        status: 'completed' as const
      }
    }
    // 情况4：只有下装
    else if (items.lower) {
      console.log('👖 Trying on lower only:', items.lower.imageUrl)
      const tryOnUrl = await virtualTryOnService.generateTryOn(items.lower.imageUrl, 'bottoms')
      virtualTryOnResult = {
        imageUrl: tryOnUrl,
        status: 'completed' as const
      }
    }
    else {
      return res.status(400).json({
        success: false,
        error: '没有适合虚拟试穿的服装'
      } as ApiResponse<null>)
    }

    res.json({
      success: true,
      data: virtualTryOnResult
    } as ApiResponse<typeof virtualTryOnResult>)

  } catch (error) {
    console.error('Virtual try-on generation failed:', error)
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '虚拟试穿生成失败'
    } as ApiResponse<null>)
  }
})

export default router
