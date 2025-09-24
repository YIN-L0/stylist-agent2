import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { OutfitRecommendation, VirtualTryOnResult } from '@shared/types'
import ProductImage from './ProductImage'
import VirtualTryOnImage from './VirtualTryOnImage'
import Toast from './Toast'
import { apiService } from '../services/apiService'

interface OutfitCardProps {
  recommendation: OutfitRecommendation
  index: number
}

const OutfitCard: React.FC<OutfitCardProps> = ({ recommendation, index }) => {
  // 已移除调试日志以避免泄露outfit信息
  // 不再记录任何outfit.name信息到控制台
  const [virtualTryOn, setVirtualTryOn] = useState<VirtualTryOnResult | undefined>(recommendation.virtualTryOn)
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleGenerateTryOn = async () => {
    if (isGeneratingTryOn || virtualTryOn) return

    setIsGeneratingTryOn(true)
    
    // 设置加载状态
    setVirtualTryOn({
      imageUrl: '',
      status: 'loading'
    })

    try {
      const result = await apiService.generateVirtualTryOn(recommendation.outfit.id, recommendation.items)
      setVirtualTryOn(result)
    } catch (error) {
      console.error('Failed to generate virtual try-on:', error)
      
      let errorMessage = '生成失败'
      if (error instanceof Error) {
        if (error.message.includes('credits exhausted')) {
          errorMessage = '虚拟试穿服务暂时不可用，请稍后重试'
        } else if (error.message.includes('rate limit')) {
          errorMessage = '请求过于频繁，请稍后重试'
        } else {
          errorMessage = error.message
        }
      }
      
      setVirtualTryOn({
        imageUrl: 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=试穿效果暂时不可用',
        status: 'failed',
        error: errorMessage
      })
    } finally {
      setIsGeneratingTryOn(false)
    }
  }


  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* 卡片头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-xl font-semibold text-gray-900">
            精选搭配
          </h4>
        </div>
      </div>

      {/* 服装单品网格 - 更大的图片显示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(recommendation.items)
          .filter(([type, item]) => type !== 'shoes' && item) // 暂时不显示鞋子，并确保item存在
          .map(([type, item]) => (
            <ProductImage
              key={type}
              productId={item.productId}
              type={type}
              imageUrl={item.imageUrl}
              productUrl={item.productUrl}
              className="aspect-[3/4] rounded-xl h-64 md:h-80"
            />
          ))}
      </div>

      {/* 推荐信息 */}
      <div className="space-y-4">
        {/* 合并的AI分析和推荐理由 */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {recommendation.reason}
          </p>
        </div>

        {/* 详细信息 */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            🎨 {recommendation.outfit.style}
          </span>
          {recommendation.outfit.occasions.map((occasion, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              📍 {occasion}
            </span>
          ))}
        </div>
      </div>

      {/* 虚拟试穿效果 */}
      {virtualTryOn ? (
        <VirtualTryOnImage 
          virtualTryOn={virtualTryOn}
          className="mt-6"
        />
      ) : (
        <div className="mt-6">
          <button
            onClick={handleGenerateTryOn}
            disabled={isGeneratingTryOn}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:cursor-not-allowed"
          >
            {isGeneratingTryOn ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>正在生成试穿效果...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>🎭 生成虚拟试穿效果</span>
              </>
            )}
          </button>
        </div>
      )}


      {/* Toast 提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default OutfitCard
