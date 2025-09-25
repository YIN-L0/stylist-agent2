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

  // 点击任何地方都关闭模态框
  const handleClick = () => {
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-pointer"
      onClick={handleClick}
    >
      {/* 移除所有按钮和标签，只保留放大的图片 */}
      <img
        src={imageUrl}
        alt={`${type} - ${productId}`}
        className="transform scale-300 object-contain rounded-lg shadow-2xl max-w-none"
        style={{
          width: 'auto',
          height: 'auto',
          maxWidth: '33.333%', // 由于放大3倍，原始最大宽度为33.333%
          maxHeight: '33.333%' // 由于放大3倍，原始最大高度为33.333%
        }}
      />
    </div>
  )
}

export default ImageModal
