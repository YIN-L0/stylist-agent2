import axios from 'axios'

export interface VirtualTryOnResult {
  imageUrl: string
  status: 'loading' | 'completed' | 'failed'
  error?: string
}

export class VirtualTryOnService {
  private readonly API_KEY = process.env.FASHN_API_KEY
  private readonly BASE_URL = 'https://api.fashn.ai/v1'
  private readonly MODEL_IMAGE = 'https://i.imgur.com/r6GqWxn.png'
  private readonly POLLING_INTERVAL = 2000 // 2秒轮询间隔
  private readonly MAX_POLLING_ATTEMPTS = 30 // 最大轮询次数 (60秒超时)

  constructor() {
    if (!this.API_KEY) {
      console.warn('⚠️ FASHN_API_KEY not found in environment variables')
    }
  }

  /**
   * 生成虚拟试穿效果
   * @param garmentImageUrl 服装图片URL
   * @param category 服装类别
   * @returns 试穿效果图URL
   */
  async generateTryOn(garmentImageUrl: string, category: 'auto' | 'tops' | 'bottoms' | 'one-pieces' = 'auto'): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('FASHN API key not configured')
    }

    try {
      console.log(`🎭 Starting virtual try-on for garment: ${garmentImageUrl}`)
      
      // 1. 提交试穿请求
      const response = await axios.post(
        `${this.BASE_URL}/run`,
        {
          model_name: 'tryon-v1.6',
          inputs: {
            model_image: this.MODEL_IMAGE,
            garment_image: garmentImageUrl
          },
          category: category,
          mode: 'balanced',
          segmentation_free: true,
          moderation_level: 'permissive',
          garment_photo_type: 'auto',
          output_format: 'png',
          return_base64: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          timeout: 30000
        }
      )

      const predictionId = response.data.id
      console.log(`📝 Virtual try-on request submitted: ${predictionId}`)

      // 2. 轮询获取结果
      return await this.pollForResult(predictionId)
    } catch (error) {
      console.error('❌ Virtual try-on failed:', error)
      throw new Error(`Virtual try-on failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 生成上下装组合试穿效果
   * @param upperUrl 上装图片URL
   * @param lowerUrl 下装图片URL
   * @returns 最终试穿效果图URL
   */
  async generateUpperLowerTryOn(upperUrl: string, lowerUrl: string): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('FASHN API key not configured')
    }

    try {
      console.log(`👕 Starting upper-lower try-on: ${upperUrl} + ${lowerUrl}`)
      
      // 1. 先试穿上装
      console.log('👕 Trying on upper garment...')
      const upperResult = await this.generateTryOn(upperUrl, 'tops')
      
      // 2. 用上装试穿结果作为模特图，试穿下装
      console.log('👖 Trying on lower garment...')
      const finalResult = await this.generateTryOnWithModel(lowerUrl, upperResult, 'bottoms')
      
      console.log('✅ Upper-lower try-on completed')
      return finalResult
    } catch (error) {
      console.error('❌ Upper-lower try-on failed:', error)
      throw new Error(`Upper-lower try-on failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 使用自定义模特图生成试穿效果
   * @param garmentImageUrl 服装图片URL
   * @param modelImageUrl 模特图片URL
   * @param category 服装类别
   * @returns 试穿效果图URL
   */
  private async generateTryOnWithModel(
    garmentImageUrl: string, 
    modelImageUrl: string, 
    category: 'auto' | 'tops' | 'bottoms' | 'one-pieces' = 'auto'
  ): Promise<string> {
    try {
      console.log(`🎭 Starting virtual try-on with custom model: ${garmentImageUrl}`)
      
      // 1. 提交试穿请求
      const response = await axios.post(
        `${this.BASE_URL}/run`,
        {
          model_name: 'tryon-v1.6',
          inputs: {
            model_image: modelImageUrl,
            garment_image: garmentImageUrl
          },
          category: category,
          mode: 'balanced',
          segmentation_free: true,
          moderation_level: 'permissive',
          garment_photo_type: 'auto',
          output_format: 'png',
          return_base64: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          },
          timeout: 30000
        }
      )

      const predictionId = response.data.id
      console.log(`📝 Virtual try-on request submitted: ${predictionId}`)

      // 2. 轮询获取结果
      return await this.pollForResult(predictionId)
    } catch (error) {
      console.error('❌ Virtual try-on with custom model failed:', error)
      throw new Error(`Virtual try-on failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 轮询获取试穿结果
   * @param predictionId 预测ID
   * @returns 试穿效果图URL
   */
  private async pollForResult(predictionId: string): Promise<string> {
    let attempts = 0
    
    while (attempts < this.MAX_POLLING_ATTEMPTS) {
      try {
        const response = await axios.get(`${this.BASE_URL}/status/${predictionId}`, {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`
          },
          timeout: 10000
        })

        const { status, output, error } = response.data

        if (status === 'completed' && output && output.length > 0) {
          console.log(`✅ Virtual try-on completed: ${output[0]}`)
          return output[0]
        }

        if (status === 'failed') {
          const errorMessage = error?.message || 'Unknown error'
          console.error(`❌ Virtual try-on failed: ${errorMessage}`)
          throw new Error(`Virtual try-on failed: ${errorMessage}`)
        }

        if (status === 'processing' || status === 'queued') {
          console.log(`⏳ Virtual try-on ${status}... (attempt ${attempts + 1}/${this.MAX_POLLING_ATTEMPTS})`)
          await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL))
          attempts++
          continue
        }

        // 未知状态
        console.warn(`⚠️ Unknown status: ${status}`)
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL))
        attempts++
      } catch (error) {
        console.error(`❌ Polling error (attempt ${attempts + 1}):`, error)
        attempts++
        
        if (attempts >= this.MAX_POLLING_ATTEMPTS) {
          throw new Error('Virtual try-on polling timeout')
        }
        
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL))
      }
    }

    throw new Error('Virtual try-on polling timeout')
  }

  /**
   * 检查API密钥是否配置
   */
  isConfigured(): boolean {
    return !!this.API_KEY
  }
}

export const virtualTryOnService = new VirtualTryOnService()
