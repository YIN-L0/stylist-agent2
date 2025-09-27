import React, { useEffect } from 'react'

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string
  productId: string
  type: string
  onClose: () => void
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  imageUrl,
  productId,
  type,
  onClose
}) => {
  // ESC键关闭模态框
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // 点击背景关闭模态框
  const handleBackgroundClick = () => {
    onClose()
  }

  // 阻止图片点击事件冒泡，避免关闭模态框
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
      style={{ backgroundColor: 'rgba(120, 120, 120, 0.35)' }}
      onClick={handleBackgroundClick}
    >
      {/* 放大3倍的图片，最大不超出视口 */}
      <img
        src={imageUrl}
        alt={`${type} - ${productId}`}
        className="object-contain rounded-lg shadow-2xl cursor-default"
        style={{
          transform: 'scale(3)',
          maxWidth: '33.333%', // 由于放大3倍，原始最大宽度为33.333%
          maxHeight: '33.333%', // 由于放大3倍，原始最大高度为33.333%
          width: 'auto',
          height: 'auto'
        }}
        onClick={handleImageClick}
      />
    </div>
  )
}

export default ImageModal
