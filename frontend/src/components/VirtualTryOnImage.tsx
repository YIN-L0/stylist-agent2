import React, { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle, ImageOff, Maximize2 } from 'lucide-react'
import { VirtualTryOnResult } from '@shared/types'

interface VirtualTryOnImageProps {
  virtualTryOn?: VirtualTryOnResult
  className?: string
  gender?: 'women' | 'men'
}

const VirtualTryOnImage: React.FC<VirtualTryOnImageProps> = ({
  virtualTryOn,
  className = '',
  gender = 'women'
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // 重置状态当virtualTryOn变化时
  useEffect(() => {
    if (virtualTryOn?.status === 'completed') {
      setIsLoaded(false)
      setHasError(false)
    }
  }, [virtualTryOn])

  const handleImageLoad = () => {
    setIsLoaded(true)
    setHasError(false)
  }

  const handleImageError = () => {
    setHasError(true)
    setIsLoaded(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (virtualTryOn?.imageUrl) {
      setShowModal(true)
    }
  }

  // 如果没有虚拟试穿数据，不显示
  if (!virtualTryOn) {
    return null
  }

  // 加载状态
  if (virtualTryOn.status === 'loading') {
    return (
      <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">🎭 虚拟试穿中</h3>
              <p className="text-sm text-gray-600">AI正在为您生成试穿效果图...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 失败状态
  if (virtualTryOn.status === 'failed') {
    return (
      <div className={`bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">❌ 试穿生成失败</h3>
              <p className="text-sm text-gray-600 mb-2">
                {virtualTryOn.error || '生成试穿效果图时出现错误'}
              </p>
              <button 
                className="text-sm text-purple-600 hover:text-purple-700 font-medium underline"
                onClick={() => window.location.reload()}
              >
                重新尝试
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 成功状态 - 显示试穿效果图
  if (virtualTryOn.status === 'completed' && virtualTryOn.imageUrl) {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 ${className}`}>
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">✨ 虚拟试穿效果</h3>
          <p className="text-sm text-gray-600">AI生成的试穿预览图</p>
        </div>
        
        <div
          className={`relative group cursor-pointer overflow-hidden rounded-xl bg-white shadow-lg mx-auto ${
            gender === 'women'
              ? 'max-w-none' // 女装：无宽度限制，显示原始大小
              : 'max-w-lg'   // 男装：比之前更大
          }`}
          style={{ aspectRatio: '5 / 7' }}
          onClick={handleClick}
        >
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-500">加载中...</span>
              </div>
            </div>
          )}

          <img
            src={virtualTryOn.imageUrl}
            alt="虚拟试穿效果"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isLoaded ? 'group-hover:scale-105' : 'opacity-0'
            }`}
            style={{ objectPosition: 'center' }}
            loading="lazy"
          />

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600 text-white text-center p-4">
              <ImageOff className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">试穿效果图加载失败</span>
              <span className="text-xs mt-1">请稍后重试</span>
            </div>
          )}

          {/* 悬停遮罩 */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
            <div className="transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform">
                <Maximize2 className="w-4 h-4 text-gray-700" />
              </div>
            </div>
          </div>

          {/* 试穿标签 */}
          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            AI试穿
          </div>
        </div>

        {/* 全屏模态框 */}
        {showModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">虚拟试穿效果</h3>
                  <p className="text-sm text-gray-500">AI生成的试穿预览图</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              {/* 图片 */}
              <div className="p-4">
                <img
                  src={virtualTryOn.imageUrl}
                  alt="虚拟试穿效果"
                  className="w-full h-auto object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-96 bg-gradient-to-br from-gray-400 to-gray-600 flex flex-col items-center justify-center text-white rounded-lg">
                        <div class="text-6xl mb-4">🎭</div>
                        <div class="text-lg font-medium">试穿效果图</div>
                        <div class="text-sm opacity-80 mt-2">图片加载失败</div>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

export default VirtualTryOnImage
