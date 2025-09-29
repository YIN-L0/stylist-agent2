import express from 'express'
import { recommendationService } from '../services/recommendationService'
import { exactMatchRecommendationService } from '../services/exactMatchRecommendationService'
import { RecommendationRequest, ApiResponse, RecommendationResponse } from '../types'

const router = express.Router()

// POST /api/recommend - 获取服装推荐
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { scenario, skipVirtualTryOn = false, gender }: RecommendationRequest & { gender?: 'women' | 'men' } = req.body

    if (!scenario || typeof scenario !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的场景描述'
      } as ApiResponse<null>)
    }

    if (scenario.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: '场景描述太短，请提供更详细的描述'
      } as ApiResponse<null>)
    }

    console.log(`Processing recommendation request: "${scenario}" (skipVirtualTryOn: ${skipVirtualTryOn}, gender: ${gender || 'women'})`)

    // 使用新的精确匹配推荐算法
    const exactMatchRecommendations = await exactMatchRecommendationService.getExactMatchRecommendations(scenario, gender)

    let response: RecommendationResponse

    if (exactMatchRecommendations.length > 0) {
      // 如果有精确匹配结果，使用精确匹配
      console.log(`✅ Using exact match results: ${exactMatchRecommendations.length} recommendations`)
      response = {
        recommendations: exactMatchRecommendations,
        analysis: `基于您的具体需求"${scenario}"，我们采用精确匹配算法为您找到了${exactMatchRecommendations.length}套完美符合要求的搭配。每一套都经过产品名称、颜色、风格和场合的精确筛选，确保与您的需求完美匹配。`
      }
    } else {
      // 如果没有精确匹配结果，回退到原始算法
      console.log(`⚠️ No exact matches found, falling back to original algorithm`)
      const result = await recommendationService.getRecommendations(scenario, skipVirtualTryOn, gender)
      response = {
        recommendations: result.recommendations,
        analysis: `感谢您选择我们的专业造型服务。针对您提到的"${scenario}"这一场合，我为您精心挑选了适合${result.analysis.occasions?.join('、') || '各种'}场合的搭配方案。每一套搭配都经过专业考量，既符合场合的优雅要求，又能充分展现您的个人魅力与品味。相信这些搭配将助您在重要时刻展现最佳状态。`
      }
    }

    res.json({
      success: true,
      data: response
    } as ApiResponse<RecommendationResponse>)

  } catch (error) {
    console.error('Recommendation error:', error)
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '推荐服务暂时不可用，请稍后重试'
    } as ApiResponse<null>)
  }
})

export default router

