import React, { useState, useRef } from 'react'
import { Sparkles, RefreshCw, AlertCircle, Wand2, Zap } from 'lucide-react'
import { apiService } from '../services/apiService'
import { RecommendationResponse } from '@shared/types'
import OutfitCard from './OutfitCard'
import LoadingSpinner from './LoadingSpinner'

const StylistAgent: React.FC = () => {
  const [scenario, setScenario] = useState('')
  const [currentScenario, setCurrentScenario] = useState('') // 保存当前推荐使用的场景
  const [isLoading, setIsLoading] = useState(false)
  const [gender, setGender] = useState<'women' | 'men'>('women')
  const [visibleCount, setVisibleCount] = useState(9)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scenario.trim() || isLoading) return

    setIsLoading(true)
    setLoadingMessage('正在分析场景并生成推荐...')
    setError(null)
    
    try {
      console.log('Getting recommendations for:', scenario)
      const result = await apiService.getRecommendations({ 
        scenario,
        skipVirtualTryOn: true,
        gender
      })
      console.log('Received recommendations:', result)
      console.log('Number of recommendations:', result?.recommendations?.length || 0)
      setRecommendations(result)
      setCurrentScenario(scenario) // 保存当前场景
      setVisibleCount(9) // 重置显示数量
      
      // 成功后清空输入框
      setScenario('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error getting recommendations:', error)
      setError(error instanceof Error ? error.message : '获取推荐失败，请稍后重试')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScenario(e.target.value)
    
    // 自动调整高度
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }

  const handleReset = () => {
    setScenario('')
    setCurrentScenario('')
    setRecommendations(null)
    setError(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  const handleRefreshRecommendations = async () => {
    if (!currentScenario.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Refreshing recommendations for:', currentScenario)
      const result = await apiService.getRecommendations({ 
        scenario: currentScenario,
        skipVirtualTryOn: true,
        gender
      })
      setRecommendations(result)
      setVisibleCount(9) // 重置显示数量
    } catch (error) {
      console.error('Error refreshing recommendations:', error)
      setError(error instanceof Error ? error.message : '刷新推荐失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (example: string) => {
    setScenario(example)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
      textareaRef.current.focus()
    }
  }

  const womenExampleScenarios = [
    '推荐一套精致休闲风格的穿搭，适合和朋友周末早午餐',
    '帮我找优雅时尚风格的穿搭，适合浪漫的约会夜晚',
    '我需要一套经典典雅风格的穿搭，适合正式的商务晚宴',
    '我需要一套搭配白色体恤日常休闲风格的穿搭，适合旅行时穿',
    '我下周有一个派对活动，帮我推荐华丽风格的半裙穿搭',
    '帮我推荐优雅时尚风格的穿搭，适合日常办公室'
  ]

  const menExampleScenarios = [
    '我要参加商务晚宴，帮我找一套商务正装风格的穿搭',
    '帮我推荐一些商务休闲风格的穿搭,适合日常办公室',
    '帮我推荐一些浅色系日常休闲风的穿搭，适合周末和朋友去早午餐',
    '我需要一套精致休闲风格的穿搭，适合晚上去约会',
    '我准备去旅行，想要轻松的日常休闲风，最好是圆领T恤搭配',
    '帮我找一套精致休闲风格的西服'
  ]

  const exampleScenarios = gender === 'women' ? womenExampleScenarios : menExampleScenarios

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* 主输入区域 */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
            
            {/* 头部标题 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-full mb-6 shadow-lg">
                <Wand2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                AI时尚造型师
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                告诉我你的场景需求，我为你量身定制最合适的服装搭配方案
              </p>
            </div>

            {/* 输入表单 */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 性别切换 */}
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={() => setGender('women')} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${gender==='women'?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>女装</button>
                <button type="button" onClick={() => setGender('men')} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${gender==='men'?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>男装</button>
              </div>
              <div className="relative">
                <div className="absolute top-4 left-4 text-gray-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <textarea
                  ref={textareaRef}
                  id="scenario"
                  value={scenario}
                  onChange={handleTextareaChange}
                  placeholder="例如：参加公司年会，需要正式但不过于隆重的着装，希望看起来专业又有亲和力..."
                  className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 resize-none min-h-[120px] text-gray-900 placeholder-gray-400 text-lg leading-relaxed"
                  disabled={isLoading}
                  rows={3}
                />
                
                {scenario && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* 示例场景 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">快速开始 - 点击下方示例：</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exampleScenarios.map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleExampleClick(example)}
                      disabled={isLoading}
                      className="p-4 text-left bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-all duration-200 disabled:opacity-50 border border-gray-200 hover:border-gray-300 hover:shadow-md"
                    >
                      <div className="text-sm leading-relaxed">{example}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={!scenario.trim() || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 hover:from-blue-600 hover:via-purple-700 hover:to-pink-600 text-white font-bold py-6 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 text-lg"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    <span>{loadingMessage || 'AI正在为您精心挑选...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>获取专属时尚推荐</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-2xl shadow-lg">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-red-400 mt-1 mr-4 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">获取推荐失败</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-500 font-medium underline"
                  >
                    关闭错误信息
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 推荐结果区域 */}
        {recommendations && (
          <div className="space-y-12">
            {/* 用户输入场景展示 */}
            {currentScenario && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">您的场景需求</h3>
                      <p className="text-gray-700 text-base leading-relaxed">"{currentScenario}"</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 推荐搭配卡片 */}
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  ✨ 专属搭配推荐
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  为你精选的搭配推荐 {visibleCount < recommendations.recommendations.length ? `(显示 ${visibleCount}/${recommendations.recommendations.length} 套)` : `(共 ${recommendations.recommendations.length} 套)`}
                </p>
                
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {recommendations.recommendations.slice(0, visibleCount).map((recommendation, index) => (
                  <OutfitCard
                    key={recommendation.outfit.id}
                    recommendation={recommendation}
                    index={index}
                  />
                ))}
              </div>

              {/* 加载更多 */}
              {visibleCount < recommendations.recommendations.length && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => setVisibleCount(v => v + 9)}
                    className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 font-semibold py-4 px-8 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200"
                  >加载更多</button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StylistAgent