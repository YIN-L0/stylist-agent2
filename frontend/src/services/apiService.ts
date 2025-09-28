import axios from 'axios'
import { RecommendationRequest, RecommendationResponse, ApiResponse, Outfit, VirtualTryOnResult } from '@shared/types'

// 规范化 API 基础地址：如果未包含 /api，则自动补齐
const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stylist-agent2-production-2.up.railway.app/api'
const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api')
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL.replace(/\/$/, '')}/api`

console.log('API_BASE_URL:', API_BASE_URL) // 调试日志

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120秒超时（虚拟试穿需要更长时间）
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    
    if (error.response) {
      // 服务器返回错误状态码
      const message = error.response.data?.error || '服务器错误'
      return Promise.reject(new Error(message))
    } else if (error.request) {
      // 请求发送但没有收到响应
      return Promise.reject(new Error('网络连接错误，请检查网络'))
    } else {
      // 其他错误
      return Promise.reject(new Error('请求配置错误'))
    }
  }
)

export const apiService = {
  // 获取服装推荐
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      console.log('Making API request to:', API_BASE_URL + '/recommend')
      console.log('Request data:', request)
      
      const response = await apiClient.post<ApiResponse<RecommendationResponse>>('/recommend', request)
      
      console.log('API response:', response.data)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取推荐失败')
      }
      
      return response.data.data!
    } catch (error) {
      console.error('API Error details:', error)
      throw error
    }
  },

  // 获取所有服装列表
  async getAllOutfits(): Promise<Outfit[]> {
    try {
      const response = await apiClient.get<ApiResponse<Outfit[]>>('/outfits')
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取服装列表失败')
      }
      
      return response.data.data!
    } catch (error) {
      throw error
    }
  },

  // 获取特定服装详情
  async getOutfitById(id: number): Promise<Outfit> {
    try {
      const response = await apiClient.get<ApiResponse<Outfit>>(`/outfits/${id}`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取服装详情失败')
      }
      
      return response.data.data!
    } catch (error) {
      throw error
    }
  },

  // 生成虚拟试穿效果
  async generateVirtualTryOn(outfitId: number, items: any): Promise<VirtualTryOnResult> {
    try {
      console.log('Generating virtual try-on for outfit:', outfitId)
      
      const response = await apiClient.post<ApiResponse<VirtualTryOnResult>>('/virtual-tryon', {
        outfitId,
        items
      })

      if (!response.data.success) {
        throw new Error(response.data.error || '虚拟试穿生成失败')
      }

      return response.data.data!
    } catch (error) {
      console.error('Virtual try-on generation failed:', error)
      throw error
    }
  },

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health')
      return response.status === 200
    } catch (error) {
      return false
    }
  }
}

