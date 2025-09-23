import React, { useState, useRef, useEffect } from 'react'
import { ExternalLink, ImageOff, Maximize2, Copy, Check } from 'lucide-react'
import ProductModal from './ProductModal'

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
  const [copied, setCopied] = useState(false)
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

  const handleDirectLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(productUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCopyImageLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(imageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // 2秒后重置状态
    } catch (err) {
      console.error('Failed to copy image link:', err)
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea')
      textArea.value = imageUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
      className={`group cursor-pointer relative overflow-hidden bg-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}
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
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
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

                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                    <div className="transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                      <div className="bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform">
                        <Maximize2 className="w-4 h-4 text-gray-700" />
                      </div>
                      <div 
                        className="bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform cursor-pointer"
                        onClick={handleDirectLink}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-700" />
                      </div>
                      <div 
                        className={`rounded-full p-2 shadow-lg hover:scale-110 transition-transform cursor-pointer ${
                          copied ? 'bg-green-100' : 'bg-white'
                        }`}
                        onClick={handleCopyImageLink}
                        title="复制图片链接"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-700" />
                        )}
                      </div>
                    </div>
                  </div>

          {/* 产品类型标签 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="text-white text-xs font-medium capitalize opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {type}
            </div>
          </div>

          {/* 产品ID */}
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {productId}
          </div>
        </>
      )}

      {/* 产品详情弹窗 */}
      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        productId={productId}
        type={type}
        imageUrl={imageUrl}
        productUrl={productUrl}
      />
    </div>
  )
}

export default ProductImage
