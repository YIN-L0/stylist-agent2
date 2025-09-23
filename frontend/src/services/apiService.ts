import axios from 'axios'
import { RecommendationRequest, RecommendationResponse, ApiResponse, Outfit } from '@shared/types'

const API_BASE_URL = 'https://stylist-agent2-production.up.railway.app/api'

console.log('Using hardcoded API_BASE_URL:', API_BASE_URL) // 调试日志

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
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

