import React from 'react'
import { Heart, Share2, Star } from 'lucide-react'
import { OutfitRecommendation } from '@shared/types'
import ProductImage from './ProductImage'
import VirtualTryOnImage from './VirtualTryOnImage'

interface OutfitCardProps {
  recommendation: OutfitRecommendation
  index: number
}

const OutfitCard: React.FC<OutfitCardProps> = ({ recommendation, index }) => {
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

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* 卡片头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-bold text-sm">
            {index + 1}
          </div>
          <h4 className="text-xl font-semibold text-gray-900">
            {recommendation.outfit.name || `推荐搭配 ${index + 1}`}
          </h4>
        </div>
        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* 匹配度显示 */}
      <div className="mb-6">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(recommendation.matchScore)}`}>
          <span>{getMatchIcon(recommendation.matchScore)}</span>
          <span>匹配度 {recommendation.matchScore}%</span>
        </div>
      </div>

              {/* 服装单品网格 - 响应式布局，暂时不显示鞋子 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {Object.entries(recommendation.items)
                  .filter(([type]) => type !== 'shoes') // 暂时不显示鞋子
                  .map(([type, item]) => (
                  <ProductImage
                    key={type}
                    productId={item.productId}
                    type={type}
                    imageUrl={item.imageUrl}
                    productUrl={item.productUrl}
                    className="aspect-square rounded-xl"
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
            🎨 {recommendation.outfit.style}
          </span>
          {recommendation.outfit.occasions.map((occasion, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              📍 {occasion}
            </span>
          ))}
        </div>
      </div>

      {/* 虚拟试穿效果 */}
      <VirtualTryOnImage 
        virtualTryOn={recommendation.virtualTryOn}
        className="mt-6"
      />

      {/* 底部操作按钮 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex gap-3">
          <button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
            <Heart className="w-4 h-4" />
            <span>收藏搭配</span>
          </button>
          <button className="px-4 py-3 border-2 border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="px-4 py-3 border-2 border-yellow-200 text-yellow-600 text-sm font-medium rounded-xl hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200 flex items-center justify-center">
            <Star className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default OutfitCard
