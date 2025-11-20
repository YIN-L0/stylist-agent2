import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface VideoModalProps {
  videoUrl: string
  onClose: () => void
  title?: string
}

const VideoModal: React.FC<VideoModalProps> = ({ videoUrl, onClose, title }) => {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // 按 ESC 键关闭
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    // 防止背景滚动
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
          aria-label="Close video"
        >
          <X className="w-8 h-8" />
        </button>

        {/* 标题 */}
        {title && (
          <div className="absolute -top-12 left-0 text-white text-lg font-medium">
            {title}
          </div>
        )}

        {/* 视频播放器 */}
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-auto max-h-[80vh]"
            onError={() => {
              console.error('Failed to load video:', videoUrl)
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* 提示文字 */}
        <div className="text-center mt-4 text-white text-sm">
          {t('pressEscToClose', 'Press ESC or click outside to close')}
        </div>
      </div>
    </div>
  )
}

export default VideoModal
