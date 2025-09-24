import React from 'react'
import { X } from 'lucide-react'

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  productId?: string
  type?: string
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  isOpen, 
  imageUrl, 
  onClose, 
  productId, 
  type 
}) => {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* 图片 */}
        <img
          src={imageUrl}
          alt={`${type} - ${productId}`}
          className="w-full h-full object-contain rounded-lg"
          style={{ maxHeight: '85vh' }}
        />
        
        {/* 图片信息 */}
        {(productId || type) && (
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
            {type && <div className="text-sm font-medium capitalize">{type}</div>}
            {productId && <div className="text-xs opacity-80">{productId}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageModal
