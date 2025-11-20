import React, { useState } from 'react'
import { Download, Share2, Star, Sparkles, Eye, RefreshCw, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OutfitRecommendation, VirtualTryOnResult } from '@shared/types'
import ProductImage from './ProductImage'
import VirtualTryOnImage from './VirtualTryOnImage'
import Toast from './Toast'
import VideoModal from './VideoModal'
import { apiService } from '../services/apiService'

interface OutfitCardProps {
  recommendation: OutfitRecommendation
  index: number
}

const OutfitCard: React.FC<OutfitCardProps> = ({ recommendation, index }) => {
  const { t, i18n } = useTranslation()
  // 已移除调试日志以避免泄露outfit信息
  const [virtualTryOn, setVirtualTryOn] = useState<VirtualTryOnResult | undefined>(recommendation.virtualTryOn)
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // 场合标签翻译映射
  const translateOccasion = (occasion: string): string => {
    if (i18n.language !== 'en') return occasion // 中文时直接返回

    const translations: Record<string, string> = {
      '婚礼嘉宾': 'Wedding Guest',
      '商务晚宴': 'Business Dinner',
      '日常办公室': 'Daily Office',
      '周末早午餐': 'Weekend Brunch',
      '约会夜晚': 'Date Night',
      '派对': 'Party',
      '休闲日常': 'Casual Daily',
      '旅行': 'Travel',
      '正式场合': 'Formal Occasion',
      '商务正装': 'Business Formal',
      '商务休闲': 'Business Casual',
      '日常休闲': 'Everyday Casual',
      '精致休闲': 'Smart Casual',
      '运动休闲': 'Athleisure',
      '度假': 'Vacation',
      '聚会': 'Gathering',
      '晚宴': 'Dinner',
      '约会': 'Date',
      '办公': 'Office',
      '早午餐': 'Brunch'
    }

    return translations[occasion] || occasion
  }

  // 风格标签翻译映射
  const translateStyle = (style: string): string => {
    if (i18n.language !== 'en') return style // 中文时直接返回

    const translations: Record<string, string> = {
      '经典': 'Classic',
      '优雅时尚': 'Chic',
      '精致休闲': 'Smart Casual',
      '休闲': 'Casual',
      '华丽': 'Glam',
      '商务正装': 'Business Formal',
      '商务休闲': 'Business Casual',
      '运动休闲': 'Athleisure',
      '街头': 'Street Style',
      '波西米亚': 'Bohemian',
      '复古': 'Vintage',
      '极简': 'Minimalist'
    }

    return translations[style] || style
  }

  // 新增：跟踪当前显示的TryOn图片索引
  const [tryOnImageIndex, setTryOnImageIndex] = useState<number>(0)
  const [showTryOnImage, setShowTryOnImage] = useState<boolean>(false)
  const [isLoadingTryOn, setIsLoadingTryOn] = useState<boolean>(false)

  // 视频相关状态
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false)
  const [videoUrl, setVideoUrl] = useState<string>('')

  // 处理生成视频按钮点击
  const handleGenerateVideo = () => {
    // 提取outfit ID
    const outfitIdNumber = recommendation.outfit.name.toLowerCase().replace('outfit ', '')
    const gender = recommendation.outfit.gender || 'women'

    // 为特定outfit设置视频URL映射
    const videoMapping: Record<string, string> = {
      '8': 'https://maistyle01.oss-cn-shanghai.aliyuncs.com/demo/video/pink_dress_1.mp4',
      '40': 'https://maistyle01.oss-cn-shanghai.aliyuncs.com/demo/video/grey_dress.mp4',
      // 你可以在这里添加更多的映射
      // '1': 'https://maistyle01.oss-cn-shanghai.aliyuncs.com/demo/video/another_video.mp4',
    }

    // 如果有特定映射则使用，否则使用默认URL格式
    const generatedVideoUrl = videoMapping[outfitIdNumber] ||
      `https://maistyle01.oss-cn-shanghai.aliyuncs.com/videos/${gender}_outfit${outfitIdNumber}.mp4`

    setVideoUrl(generatedVideoUrl)
    setShowVideoModal(true)
  }

  // 处理视频上传
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 创建本地URL用于预览
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setShowVideoModal(true)
    }
  }

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

  // 获取可用的试穿图片数量
  const getAvailableTryOnImageCount = () => {
    const gender = recommendation.outfit.gender || 'women'

    if (gender === 'men') {
      return 1 // 男装只有一张图片
    }

    // 女装：检查实际有多少张可用图片
    if (recommendation.outfit.tryOnImages) {
      let count = 0
      if (recommendation.outfit.tryOnImages.image1?.trim()) count++
      if (recommendation.outfit.tryOnImages.image2?.trim()) count++
      if (recommendation.outfit.tryOnImages.image3?.trim()) count++
      return Math.max(count, 1) // 至少返回1
    }

    return 3 // 默认3张（后备方案）
  }

  // 新增：处理查看生成换装按钮点击
  const handleViewTryOnImage = () => {
    console.log('TryOn button clicked', { isLoadingTryOn, showTryOnImage, tryOnImageIndex })

    // 如果正在加载，不响应点击
    if (isLoadingTryOn) return

    if (!showTryOnImage) {
      // 第一次点击：显示加载动画4秒，然后显示第一张图片
      console.log('First click - showing loading animation')
      setIsLoadingTryOn(true)
      setTimeout(() => {
        console.log('Loading complete - showing first image')
        setShowTryOnImage(true)
        setTryOnImageIndex(0)
        setIsLoadingTryOn(false)
      }, 5000) // 5秒加载时间
    } else {
      // 后续点击：加载4秒后切换到下一张
      console.log('Subsequent click - switching to next image')
      setIsLoadingTryOn(true)
      setTimeout(() => {
        const availableImageCount = getAvailableTryOnImageCount()
        const nextIndex = (tryOnImageIndex + 1) % availableImageCount
        console.log(`Switching to image index: ${nextIndex} (out of ${availableImageCount} available images)`)
        setTryOnImageIndex(nextIndex)
        setIsLoadingTryOn(false)
      }, 5000)
    }
  }

  // 获取当前应该显示的TryOn图片URL - 从后端数据获取，如无则使用生成的URL
  const getCurrentTryOnImageUrl = () => {
    const gender = recommendation.outfit.gender || 'women' // 默认为女装

    // 首先尝试从后端数据获取
    if (recommendation.outfit.tryOnImages) {
      let imageUrl = ''

      if (gender === 'men') {
        // 男装只有一张图片，所有索引都显示同一张图片
        imageUrl = recommendation.outfit.tryOnImages.image1 || ''
      } else {
        // 女装有三张不同的图片
        switch (tryOnImageIndex) {
          case 0:
            imageUrl = recommendation.outfit.tryOnImages.image1 || ''
            break
          case 1:
            imageUrl = recommendation.outfit.tryOnImages.image2 || ''
            break
          case 2:
            imageUrl = recommendation.outfit.tryOnImages.image3 || ''
            break
          default:
            imageUrl = recommendation.outfit.tryOnImages.image1 || ''
        }
      }

      // 如果找到有效的URL，返回它
      if (imageUrl && imageUrl.trim()) {
        console.log(`Using CSV image URL for ${gender}: ${imageUrl}`)
        return imageUrl
      }
    }

    // 如果没有后端数据或URL为空，使用生成的URL作为后备
    const outfitIdNumber = recommendation.outfit.name.toLowerCase().replace('outfit ', '')
    const imageNumber = tryOnImageIndex + 1

    // 根据性别确定URL前缀
    const prefix = gender === 'men' ? 'men_outfit' : 'outfit'

    const fallbackUrl = `https://maistyle01.oss-cn-shanghai.aliyuncs.com/tryon/${prefix}${outfitIdNumber}_${imageNumber}.jpg`
    console.log(`Using fallback URL for ${gender}: ${fallbackUrl}`)
    return fallbackUrl
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* 卡片头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-xl font-semibold text-gray-900">
            {t('selectedOutfit')}
          </h4>
        </div>
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
            {translateStyle(recommendation.outfit.style)}
          </span>
          {recommendation.outfit.occasions.map((occasion, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {translateOccasion(occasion)}
            </span>
          ))}
        </div>

        {/* 生成换装和生成视频按钮 - 并排显示 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleViewTryOnImage}
            disabled={isLoadingTryOn}
            className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showTryOnImage ? t('switchTryOn') : t('generateTryOn')}
          </button>
          <button
            onClick={handleGenerateVideo}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            {t('generateVideo', '生成视频')}
          </button>
        </div>

        {/* 加载动画 */}
        {isLoadingTryOn && (
          <div className="mt-4">
            <div className="bg-gray-100 rounded-xl p-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black mb-4"></div>
              <p className="text-gray-600 text-sm">{t('generatingTryOn')}</p>
              <p className="text-gray-400 text-xs mt-1">{t('about5Seconds')}</p>
            </div>
          </div>
        )}


        {/* 显示TryOn图片 - 不显示加载时 */}
        {showTryOnImage && !isLoadingTryOn && (
          <div className="mt-4">
            <div
              className={`relative rounded-xl shadow-lg bg-gray-100 ${
                (recommendation.outfit.gender || 'women') === 'women'
                  ? 'max-w-none overflow-hidden mx-auto' // 女装：无宽度限制，overflow-hidden用于5:7裁剪
                  : ''   // 男装：无任何限制
              }`}
              style={(recommendation.outfit.gender || 'women') === 'women' ? { aspectRatio: '5 / 7' } : undefined}
            >
              <img
                src={getCurrentTryOnImageUrl() || ''}
                alt={t('tryOnNotAvailable')}
                className={`${(recommendation.outfit.gender || 'women') === 'women' ? 'w-full h-full object-cover' : ''} rounded-xl`}
                style={(recommendation.outfit.gender || 'women') === 'women' ? { objectPosition: 'center' } : undefined}
                onLoad={() => console.log('Image loaded successfully:', getCurrentTryOnImageUrl())}
                onError={(e) => {
                  console.error('Image failed to load:', getCurrentTryOnImageUrl())
                  const target = e.target as HTMLImageElement
                  target.src = `https://via.placeholder.com/300x400/f3f4f6/9ca3af?text=${encodeURIComponent(t('tryOnNotAvailable'))}`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 暂时隐藏虚拟试穿功能 */}

      {/* 视频预览模态框 */}
      {showVideoModal && videoUrl && (
        <VideoModal
          videoUrl={videoUrl}
          onClose={() => {
            setShowVideoModal(false)
            // 如果是本地上传的视频，清理URL
            if (videoUrl.startsWith('blob:')) {
              URL.revokeObjectURL(videoUrl)
            }
          }}
          title={`${recommendation.outfit.name} - ${t('videoPreview', '视频预览')}`}
        />
      )}

      {/* 隐藏的文件上传输入 */}
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ display: 'none' }}
        id={`video-upload-${recommendation.outfit.id}`}
      />

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
