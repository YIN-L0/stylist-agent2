import React, { useState, useRef, useEffect } from 'react'
import { ImageOff } from 'lucide-react'
import ImageModal from './ImageModal'

interface ProductImageProps {
  productId: string
  type: string
  imageUrl: string
  productUrl: string
  className?: string
}

const ProductImage: React.FC<ProductImageProps> = ({
  productId,
  type,
  imageUrl,
  productUrl,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 懒加载逻辑
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

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
    setShowModal(true)
  }


  const getFallbackImage = () => {
    const typeColors: { [key: string]: string } = {
      jacket: 'from-purple-400 to-purple-600',
      upper: 'from-blue-400 to-blue-600',
      lower: 'from-green-400 to-green-600',
      dress: 'from-pink-400 to-pink-600',
      shoes: 'from-yellow-400 to-yellow-600'
    }
    
    return (
      <div className={`w-full h-full bg-gradient-to-br ${typeColors[type] || 'from-gray-400 to-gray-600'} flex flex-col items-center justify-center text-white`}>
        <ImageOff className="w-8 h-8 mb-2" />
        <span className="text-xs font-medium capitalize">{type}</span>
        <span className="text-xs opacity-80 mt-1">{productId}</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`cursor-pointer relative overflow-hidden bg-gray-100 ${className}`}
      onClick={handleClick}
    >
      {/* 加载骨架屏 */}
      {!isInView && (
        <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
        </div>
      )}

      {/* 主图片内容 */}
      {isInView && (
        <>
          {!hasError ? (
            <>
              <img
                ref={imgRef}
                src={imageUrl}
                alt={`${type} - ${productId}`}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
              
              {/* 加载状态 */}
              {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </>
          ) : (
            getFallbackImage()
          )}

          {/* 简单的点击提示 - 移除复杂的悬停效果 */}
          <div className="absolute inset-0 cursor-pointer" title="点击放大查看">
            {/* 移除所有悬停动画和按钮，避免闪烁 */}
          </div>
        </>
      )}

      {/* 图片放大模态框 */}
      <ImageModal
        isOpen={showModal}
        imageUrl={imageUrl}
        productId={productId}
        type={type}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}

export default ProductImage
