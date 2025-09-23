import React, { useState } from 'react'
import { X, ExternalLink, Heart, Share2, Copy, Check } from 'lucide-react'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  type: string
  imageUrl: string
  productUrl: string
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productId,
  type,
  imageUrl,
  productUrl
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleProductClick = () => {
    window.open(productUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCopyImageLink = async () => {
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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">{type}</h3>
            <p className="text-sm text-gray-500 font-mono">{productId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 图片 */}
        <div className="aspect-square bg-gray-100">
          <img
            src={imageUrl}
            alt={`${type} - ${productId}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex flex-col items-center justify-center text-white">
                  <div class="text-6xl mb-4">📷</div>
                  <div class="text-lg font-medium capitalize">${type}</div>
                  <div class="text-sm opacity-80 mt-2">${productId}</div>
                </div>
              `;
            }}
          />
        </div>

        {/* 操作按钮 */}
        <div className="p-4 space-y-3">
          <button
            onClick={handleProductClick}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <ExternalLink className="w-5 h-5" />
            <span>查看商品详情</span>
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={handleCopyImageLink}
              className={`flex-1 border-2 font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                copied 
                  ? 'border-green-200 bg-green-50 text-green-700' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>复制图片链接</span>
                </>
              )}
            </button>
            <button className="flex-1 border-2 border-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2">
              <Heart className="w-4 h-4" />
              <span>收藏</span>
            </button>
            <button className="flex-1 border-2 border-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" />
              <span>分享</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductModal
