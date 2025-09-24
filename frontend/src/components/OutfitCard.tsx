import React, { useState } from 'react'
import { Download, Share2, Star, Sparkles } from 'lucide-react'
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
  console.log('Rendering OutfitCard for:', recommendation.outfit.name, 'with items:', recommendation.items)
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
  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 75) return 'text-blue-600 bg-blue-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  const getMatchIcon = (score: number) => {
    if (score >= 90) return '🎯'
    if (score >= 75) return '✨'
    if (score >= 60) return '👍'
    return '📌'
  }

  const handleDownload = async () => {
    // 下载虚拟试衣图片
    if (virtualTryOn && virtualTryOn.status === 'completed' && virtualTryOn.imageUrl) {
      try {
        // 使用fetch获取图片数据
        const response = await fetch(virtualTryOn.imageUrl)
        const blob = await response.blob()
        
        // 创建下载链接
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `outfit-${recommendation.outfit.id}-tryon.png`
        link.style.display = 'none'
        
        // 触发下载
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // 清理URL对象
        window.URL.revokeObjectURL(url)
        
        setToast({ message: '试衣图片下载成功！', type: 'success' })
      } catch (error) {
        console.error('下载失败:', error)
        setToast({ message: '下载失败，请重试', type: 'error' })
      }
    }
  }

  const handleShare = async () => {
    // 复制虚拟试衣图片链接到剪贴板
    if (virtualTryOn && virtualTryOn.status === 'completed' && virtualTryOn.imageUrl) {
      try {
        await navigator.clipboard.writeText(virtualTryOn.imageUrl)
        console.log('试衣图片链接已复制到剪贴板')
        setToast({ message: '试衣图片链接已复制到剪贴板！', type: 'success' })
      } catch (err) {
        console.error('复制失败:', err)
        // 降级方案：使用传统的复制方法
        const textArea = document.createElement('textarea')
        textArea.value = virtualTryOn.imageUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setToast({ message: '试衣图片链接已复制到剪贴板！', type: 'success' })
      }
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
        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <Star className="w-5 h-5" />
        </button>
      </div>

      {/* 服装单品网格 - 响应式布局，暂时不显示鞋子 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.entries(recommendation.items)
          .filter(([type, item]) => type !== 'shoes' && item) // 暂时不显示鞋子，并确保item存在
          .map(([type, item]) => (
            <ProductImage
              key={type}
              productId={item.productId}
              type={type}
              imageUrl={item.imageUrl}
              productUrl={item.productUrl}
              className="aspect-square rounded-xl"
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

      {/* 底部操作按钮 - 只在有虚拟试穿效果时显示 */}
      {virtualTryOn && virtualTryOn.status === 'completed' && virtualTryOn.imageUrl && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button 
              onClick={handleDownload}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>下载试衣图片</span>
            </button>
            <button 
              onClick={handleShare}
              className="px-4 py-3 border-2 border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center"
              title="复制试衣图片链接"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button className="px-4 py-3 border-2 border-yellow-200 text-yellow-600 text-sm font-medium rounded-xl hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </button>
          </div>
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
