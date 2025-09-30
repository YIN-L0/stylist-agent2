import React, { useState } from 'react'
import { Download, Share2, Star, Sparkles, Eye, RefreshCw } from 'lucide-react'
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
  const [virtualTryOn, setVirtualTryOn] = useState<VirtualTryOnResult | undefined>(recommendation.virtualTryOn)
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // 新增：跟踪当前显示的TryOn图片索引
  const [tryOnImageIndex, setTryOnImageIndex] = useState<number>(0)
  const [showTryOnImage, setShowTryOnImage] = useState<boolean>(false)

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

  // 新增：处理查看生成换装按钮点击
  const handleViewTryOnImage = () => {
    if (!showTryOnImage) {
      setShowTryOnImage(true)
      setTryOnImageIndex(0) // 第一次点击显示第一张
    } else {
      // 循环切换图片: 0 -> 1 -> 2 -> 0
      setTryOnImageIndex((prev) => (prev + 1) % 3)
    }
  }

  // 获取当前应该显示的TryOn图片URL - 直接基于outfit ID生成
  const getCurrentTryOnImageUrl = () => {
    // 格式: outfit1_1.jpg, outfit1_2.jpg, outfit1_3.jpg
    const outfitIdNumber = recommendation.outfit.name.toLowerCase().replace('outfit ', '')
    const imageNumber = tryOnImageIndex + 1
    return `https://maistyle01.oss-cn-shanghai.aliyuncs.com/tryon/outfit${outfitIdNumber}_${imageNumber}.jpg`
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

      {/* 服装单品网格 - 调整为更大的图片尺寸 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(recommendation.items)
          .filter(([type, item]) => item) // 确保item存在
          .map(([type, item]) => (
            <ProductImage
              key={type}
              productId={item.productId}
              type={type}
              imageUrl={item.imageUrl}
              productUrl={item.productUrl}
              className="aspect-square rounded-xl h-32 md:h-40"
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

        {/* 查看生成换装按钮 - 始终显示 */}
        <div className="mt-4">
          <button
            onClick={handleViewTryOnImage}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            {showTryOnImage ? (
              <>
                <RefreshCw className="w-5 h-5" />
                切换换装效果 ({tryOnImageIndex + 1}/3)
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                查看生成换装
              </>
            )}
          </button>
        </div>

        {/* 显示TryOn图片 */}
        {showTryOnImage && (
          <div className="mt-4">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <img
                src={getCurrentTryOnImageUrl() || ''}
                alt={`换装效果 ${tryOnImageIndex + 1}`}
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=换装效果暂不可用'
                }}
              />
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-lg text-sm">
                换装效果 {tryOnImageIndex + 1}/3
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 暂时隐藏虚拟试穿功能 */}

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
