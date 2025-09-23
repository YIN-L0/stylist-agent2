import { database } from '../database/database'
import { openaiService, ScenarioAnalysis } from './openaiService'
import { OutfitRecommendation, ProductItem, VirtualTryOnResult } from '../types'
import { virtualTryOnService } from './virtualTryOnService'

export class RecommendationService {
  // 备用场景分析逻辑
  private fallbackAnalysis(scenario: string): ScenarioAnalysis {
    const lowerScenario = scenario.toLowerCase()
    
    const occasionKeywords = {
      'Office': ['公司', '办公', '工作', '上班', '会议', '面试'],
      'Business Dinner': ['商务', '晚宴', '正式', '商务晚餐'],
      'Date Night': ['约会', '浪漫', '晚餐', '电影', '情侣'],
      'Cocktail': ['鸡尾酒', '酒会', '社交', '聚会'],
      'Party': ['聚会', '派对', '生日', '狂欢', '夜店', '酒吧', 'club', 'going out'],
      'Celebration': ['庆祝', '庆典', '节日', '纪念', '生日派对', '聚会', 'party'],
      'Everyday Casual': ['休闲', '放松', '咖啡', '购物', '逛街', '日常'],
      'Weekend Brunch': ['早午餐', '周末', '朋友', 'brunch'],
      'Travel': ['旅行', '度假', '出游', '旅游'],
      'Festival': ['节日', '庆典', '活动'],
      'Concert': ['音乐会', '演出', '演唱会'],
      'Interview': ['面试', '求职', '应聘']
    }
    
    const detectedOccasions: string[] = []
    const keywords: string[] = []
    
    // 检测场合
    for (const [occasion, occasionKeywordsList] of Object.entries(occasionKeywords)) {
      if (occasionKeywordsList.some(keyword => lowerScenario.includes(keyword))) {
        detectedOccasions.push(occasion)
        keywords.push(...occasionKeywordsList.filter(k => lowerScenario.includes(k)))
      }
    }
    
    // 默认值
    if (detectedOccasions.length === 0) {
      detectedOccasions.push('Everyday Casual')
      keywords.push('休闲', '日常')
    }
    
    // 确定正式程度
    let formality = 'Casual'
    if (lowerScenario.includes('正式') || lowerScenario.includes('商务') || lowerScenario.includes('面试')) {
      formality = 'Formal'
    } else if (lowerScenario.includes('半正式') || lowerScenario.includes('得体') || lowerScenario.includes('smart')) {
      formality = 'Semi-Formal'
    }
    
    return {
      occasions: detectedOccasions,
      formality,
      keywords,
      context: scenario,
      confidence: 0.7 // 备用逻辑的信心度较低
    }
  }

  // 备用推荐理由生成
  private fallbackReason(scenario: string, outfit: any, score: number): string {
    const reasons = []
    
    // 分析场景特点，使用时尚术语
    const lowerScenario = scenario.toLowerCase()
    if (lowerScenario.includes('商务') || lowerScenario.includes('正式')) {
      reasons.push('这套look完美诠释了现代职场女性的power dressing')
    } else if (lowerScenario.includes('约会') || lowerScenario.includes('浪漫')) {
      reasons.push('这个搭配展现了effortless chic的约会美学')
    } else if (lowerScenario.includes('休闲') || lowerScenario.includes('度假')) {
      reasons.push('轻松随性的casual elegance，舒适度满分')
    } else if (lowerScenario.includes('聚会') || lowerScenario.includes('派对')) {
      reasons.push('party ready的造型，让你成为全场焦点')
    } else {
      reasons.push('这个搭配完美契合你的场合需求')
    }
    
    // 分析服装风格，使用时尚术语
    const styleMap: { [key: string]: string } = {
      'Classic': '经典永不过时的timeless style',
      'Chic': '法式chic的effortless elegance',
      'Glam': 'glamorous的华丽感，气场全开',
      'Smart Casual': 'smart casual的知性魅力',
      'Casual': 'casual chic的轻松时尚',
      'Elegant': 'elegant的优雅气质',
      'Trendy': 'trendy的时尚前沿感',
      'Minimalist': 'minimalist的极简美学'
    }
    
    const styleDescription = styleMap[outfit.style] || `${outfit.style}风格的独特魅力`
    reasons.push(styleDescription)
    
    // 分析场合匹配，使用时尚术语
    const occasions = outfit.occasions ? outfit.occasions.split(',').map((o: string) => o.trim()) : []
    if (occasions.length > 0) {
      const occasionMap: { [key: string]: string } = {
        'Business Dinner': '商务晚宴的sophisticated look',
        'Date Night': '约会夜的romantic vibe',
        'Everyday Casual': '日常casual的comfortable chic',
        'Office': '职场office的professional style',
        'Cocktail': 'cocktail party的glamorous appeal',
        'Party': 'party night的dramatic flair',
        'Weekend Brunch': 'weekend brunch的relaxed elegance'
      }
      
      const occasionText = occasions.slice(0, 2).map((occ: string) => occasionMap[occ] || occ).join('、')
      reasons.push(`专为${occasionText}而设计`)
    }
    
    // 强调形象效果，使用时尚术语
    if (score >= 85) {
      reasons.push('整体造型散发着confident and stylish的气场')
    } else {
      reasons.push('这个搭配让你展现出独特的fashion sense')
    }
    
    return reasons.join('，') + '。'
  }

  // 生成产品图片URL
  private generateImageUrl(productId: string): string {
    // 使用真实的阿里云OSS图片URL
    return `https://maistyle01.oss-cn-shanghai.aliyuncs.com/rare/${productId}.jpg`
  }

  // 生成产品链接
  private generateProductUrl(productId: string): string {
    // 可以自定义产品详情页面链接，这里暂时使用占位符
    return `https://example.com/products/${productId}`
  }

  // 将服装记录转换为产品项目
  private createProductItem(productId: string, type: string): ProductItem {
    return {
      productId,
      type,
      imageUrl: this.generateImageUrl(productId),
      productUrl: this.generateProductUrl(productId)
    }
  }

  // 计算匹配分数 - 优化版本
  private calculateMatchScore(outfit: any, analysis: ScenarioAnalysis): number {
    let score = 0
    const weights = {
      occasion: 0.6,    // 场合匹配权重最高
      formality: 0.25,   // 正式程度匹配
      keyword: 0.15      // 关键词匹配
    }

    // 1. 场合匹配 (60%)
    const outfitOccasions = outfit.occasions ? outfit.occasions.split(',').map((o: string) => o.trim()) : []
    const occasionScore = this.calculateOccasionSimilarity(analysis.occasions || [], outfitOccasions)
    score += weights.occasion * occasionScore

    // 2. 正式程度匹配 (25%)
    const formalityScore = this.calculateFormalityMatch(outfit.style, analysis.formality)
    score += weights.formality * formalityScore

    // 3. 关键词模糊匹配 (15%)
    const keywordScore = this.calculateKeywordSimilarity(analysis.keywords || [], outfitOccasions)
    score += weights.keyword * keywordScore

    return Math.min(score, 1) // 确保不超过1
  }

  // 计算场合相似度
  private calculateOccasionSimilarity(userOccasions: string[], outfitOccasions: string[]): number {
    if (userOccasions.length === 0 || outfitOccasions.length === 0) return 0

    let matches = 0
    for (const userOccasion of userOccasions) {
      for (const outfitOccasion of outfitOccasions) {
        if (this.isOccasionMatch(userOccasion, outfitOccasion)) {
          matches++
          break // 每个用户场合只匹配一次
        }
      }
    }

    return matches / userOccasions.length
  }

  // 判断场合是否匹配
  private isOccasionMatch(occasion1: string, occasion2: string): boolean {
    const o1 = occasion1.toLowerCase().trim()
    const o2 = occasion2.toLowerCase().trim()
    
    // 完全匹配
    if (o1 === o2) return true
    
    // 包含匹配
    if (o1.includes(o2) || o2.includes(o1)) return true
    
    // 同义词匹配
    const synonyms: { [key: string]: string[] } = {
      'business dinner': ['商务晚餐', 'business dinner', 'formal dinner'],
      'date night': ['约会', 'date night', 'romantic dinner'],
      'everyday casual': ['日常休闲', 'everyday casual', 'casual'],
      'weekend brunch': ['周末早午餐', 'weekend brunch', 'brunch'],
      'cocktail': ['鸡尾酒', 'cocktail', '酒会'],
      'party': ['聚会', 'party', '派对', '生日派对', 'going out', '夜店', '酒吧'],
      'celebration': ['庆祝', 'celebration', '庆典', '节日', '纪念', '生日派对'],
      'office': ['办公室', 'office', '工作', '上班'],
      'travel': ['旅行', 'travel', '度假', '出游']
    }

    for (const [key, values] of Object.entries(synonyms)) {
      if (values.includes(o1) && values.includes(o2)) return true
    }

    return false
  }

  // 计算正式程度匹配
  private calculateFormalityMatch(style: string, formality: string): number {
    const styleFormalityMap: { [key: string]: string[] } = {
      'Classic': ['Formal', 'Semi-Formal'],
      'Chic': ['Formal', 'Semi-Formal'],
      'Smart Casual': ['Semi-Formal'],
      'Glam': ['Formal'],
      'Casual': ['Casual']
    }

    const expectedFormalities = styleFormalityMap[style] || ['Casual']
    
    if (expectedFormalities.includes(formality)) {
      return 1.0 // 完全匹配
    } else if (formality === 'Semi-Formal' && expectedFormalities.includes('Formal')) {
      return 0.8 // 半正式可以接受正式场合
    } else if (formality === 'Casual' && expectedFormalities.includes('Semi-Formal')) {
      return 0.6 // 休闲可以接受半正式场合
    } else {
      return 0.3 // 部分匹配
    }
  }

  // 计算关键词相似度
  private calculateKeywordSimilarity(keywords: string[], outfitOccasions: string[]): number {
    if (keywords.length === 0 || !outfitOccasions || outfitOccasions.length === 0) return 0

    let matches = 0
    const allOccasions = outfitOccasions.join(' ').toLowerCase()

    for (const keyword of keywords) {
      if (allOccasions.includes(keyword.toLowerCase())) {
        matches++
      }
    }

    return matches / keywords.length
  }

  // 生成虚拟试穿效果
  private async generateVirtualTryOn(items: any): Promise<VirtualTryOnResult | undefined> {
    try {
      // 检查是否配置了FASHN API
      if (!virtualTryOnService.isConfigured()) {
        console.log('Virtual try-on not configured, skipping...')
        return undefined
      }

      console.log('Generating virtual try-on...')

      // 情况1：有连衣裙
      if (items.dress) {
        console.log('Trying on dress:', items.dress.imageUrl)
        const tryOnUrl = await virtualTryOnService.generateTryOn(items.dress.imageUrl, 'one-pieces')
        return {
          imageUrl: tryOnUrl,
          status: 'completed'
        }
      }

      // 情况2：有上装和下装
      if (items.upper && items.lower) {
        console.log('Trying on upper + lower:', items.upper.imageUrl, items.lower.imageUrl)
        const tryOnUrl = await virtualTryOnService.generateUpperLowerTryOn(
          items.upper.imageUrl,
          items.lower.imageUrl
        )
        return {
          imageUrl: tryOnUrl,
          status: 'completed'
        }
      }

      // 情况3：只有上装
      if (items.upper) {
        console.log('Trying on upper only:', items.upper.imageUrl)
        const tryOnUrl = await virtualTryOnService.generateTryOn(items.upper.imageUrl, 'tops')
        return {
          imageUrl: tryOnUrl,
          status: 'completed'
        }
      }

      // 情况4：只有下装
      if (items.lower) {
        console.log('Trying on lower only:', items.lower.imageUrl)
        const tryOnUrl = await virtualTryOnService.generateTryOn(items.lower.imageUrl, 'bottoms')
        return {
          imageUrl: tryOnUrl,
          status: 'completed'
        }
      }

      console.log('No suitable items for virtual try-on')
      return undefined
    } catch (error) {
      console.error('Virtual try-on failed:', error)
      return {
        imageUrl: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Virtual try-on failed'
      }
    }
  }

  // 选择多样化的搭配，确保每次推荐都不同
  private selectDiverseOutfits(candidates: any[], count: number): any[] {
    if (candidates.length <= count) {
      return candidates
    }

    const selected: any[] = []
    const usedOutfitIds = new Set<number>()
    
    // 首先确保选择不同风格的搭配
    const styleGroups: { [key: string]: any[] } = {}
    candidates.forEach(candidate => {
      const style = candidate.outfit.style
      if (!styleGroups[style]) {
        styleGroups[style] = []
      }
      styleGroups[style].push(candidate)
    })

    // 优先从不同风格中选择
    const styles = Object.keys(styleGroups)
    let styleIndex = 0
    
    while (selected.length < count && selected.length < candidates.length) {
      // 尝试从不同风格中选择
      if (styles.length > 0) {
        const currentStyle = styles[styleIndex % styles.length]
        const styleCandidates = styleGroups[currentStyle].filter(c => !usedOutfitIds.has(c.outfit.id))
        
        if (styleCandidates.length > 0) {
          // 随机选择一个
          const randomIndex = Math.floor(Math.random() * styleCandidates.length)
          const selectedCandidate = styleCandidates[randomIndex]
          selected.push(selectedCandidate)
          usedOutfitIds.add(selectedCandidate.outfit.id)
        }
        
        styleIndex++
      } else {
        // 如果没有风格分组，随机选择
        const remainingCandidates = candidates.filter(c => !usedOutfitIds.has(c.outfit.id))
        if (remainingCandidates.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingCandidates.length)
          const selectedCandidate = remainingCandidates[randomIndex]
          selected.push(selectedCandidate)
          usedOutfitIds.add(selectedCandidate.outfit.id)
        } else {
          break
        }
      }
    }

    return selected
  }

  async getRecommendations(scenario: string, skipVirtualTryOn: boolean = true): Promise<{
    recommendations: OutfitRecommendation[]
    analysis: ScenarioAnalysis
  }> {
    try {
      // 1. 使用AI分析用户场景 (备用简化版本)
      console.log('🤖 Analyzing scenario with AI...')
      let analysis: ScenarioAnalysis
      
      try {
        analysis = await openaiService.analyzeScenario(scenario)
        console.log('Analysis result:', analysis)
      } catch (aiError) {
        console.warn('AI analysis failed, using fallback logic:', aiError)
        // 备用分析逻辑
        analysis = this.fallbackAnalysis(scenario)
        console.log('Fallback analysis result:', analysis)
      }

      // 2. 从数据库搜索匹配的服装
      console.log('🔍 Searching for matching outfits...')
      console.log('Analysis occasions:', analysis.occasions)
      const outfits = await database.searchOutfits(
        analysis.occasions,
        [], // 不再使用styles参数
        30 // 获取更多结果用于排序
      )
      console.log('Found outfits:', outfits.length)

      if (outfits.length === 0) {
        throw new Error('No matching outfits found')
      }

      // 3. 计算匹配分数并添加随机化因素
      const scoredOutfits = outfits.map(outfit => ({
        outfit,
        score: this.calculateMatchScore(outfit, analysis),
        randomFactor: Math.random() // 添加随机因子
      }))

      // 4. 混合排序：优先考虑匹配分数，但加入随机化
      const sortedOutfits = scoredOutfits.sort((a, b) => {
        // 主要按匹配分数排序，但加入随机化
        const scoreDiff = b.score - a.score
        const randomDiff = b.randomFactor - a.randomFactor
        
        // 如果分数差异很小（<0.1），则更多依赖随机化
        if (Math.abs(scoreDiff) < 0.1) {
          return randomDiff * 0.3 + scoreDiff * 0.7
        }
        
        // 否则主要按分数排序，少量随机化
        return scoreDiff * 0.8 + randomDiff * 0.2
      })

      // 5. 选择前6个结果，然后随机选择3个不同的搭配
      const topCandidates = sortedOutfits.slice(0, Math.min(6, sortedOutfits.length))
      const selectedOutfits = this.selectDiverseOutfits(topCandidates, 3)

      // 6. 生成推荐结果
      const recommendations: OutfitRecommendation[] = []

      for (const { outfit, score } of selectedOutfits) {
        const items: any = {}

        // 为每个服装单品创建产品项目
        if (outfit.jacket_id) {
          items.jacket = this.createProductItem(outfit.jacket_id, 'jacket')
        }
        if (outfit.upper_id) {
          items.upper = this.createProductItem(outfit.upper_id, 'upper')
        }
        if (outfit.lower_id) {
          items.lower = this.createProductItem(outfit.lower_id, 'lower')
        }
        if (outfit.dress_id) {
          items.dress = this.createProductItem(outfit.dress_id, 'dress')
        }
        if (outfit.shoes_id) {
          items.shoes = this.createProductItem(outfit.shoes_id, 'shoes')
        }

        // 生成推荐理由（包含AI分析内容）
        let reason: string
        try {
          const aiReason = await openaiService.generateRecommendationReason(scenario, outfit, analysis)
          reason = `这套搭配特别适合您说的"${scenario}"！我根据您的需求，从${analysis.occasions?.join('、') || '各种'}场合中精心挑选了这套搭配。\n\n${aiReason}`
        } catch (reasonError) {
          console.warn('AI reason generation failed, using fallback:', reasonError)
          const fallbackReason = this.fallbackReason(scenario, outfit, Math.round(score * 100))
          reason = `这套搭配特别适合您说的"${scenario}"！我根据您的需求，从${analysis.occasions?.join('、') || '各种'}场合中精心挑选了这套搭配。\n\n${fallbackReason}`
          console.log('Generated fallback reason:', reason)
        }

        // 生成虚拟试穿效果
        console.log('Generating virtual try-on for outfit:', outfit.id, 'skipVirtualTryOn:', skipVirtualTryOn)
        const virtualTryOn = skipVirtualTryOn ? undefined : await this.generateVirtualTryOn(items)

        recommendations.push({
          outfit: {
            id: outfit.id,
            name: outfit.outfit_name,
            jacket: outfit.jacket_id,
            upper: outfit.upper_id,
            lower: outfit.lower_id,
            dress: outfit.dress_id,
            shoes: outfit.shoes_id,
            style: outfit.style,
            occasions: outfit.occasions ? outfit.occasions.split(',').map((o: string) => o.trim()) : []
          },
          matchScore: Math.round(score * 100), // 转换为百分比
          reason,
          items,
          virtualTryOn
        })
      }

      return {
        recommendations,
        analysis
      }
    } catch (error) {
      console.error('Error getting recommendations:', error)
      throw error
    }
  }
}

export const recommendationService = new RecommendationService()
