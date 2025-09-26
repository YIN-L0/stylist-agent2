import React from 'react'

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
      className="fixed inset-0 bg-gray-400 bg-opacity-50 flex items-center justify-center z-50 cursor-pointer"
      onClick={handleBackgroundClick}
    >
      {/* 放大9倍的图片 */}
      <img
        src={imageUrl}
        alt={`${type} - ${productId}`}
        className="transform object-contain rounded-lg shadow-2xl cursor-default"
        style={{
          width: 'auto',
          height: 'auto',
          transform: 'scale(9)', // 放大9倍
          maxWidth: '11.111%', // 由于放大9倍，原始最大宽度为11.111%
          maxHeight: '11.111%' // 由于放大9倍，原始最大高度为11.111%
        }}
        onClick={handleImageClick}
      />
    </div>
  )
}

export default ImageModal
