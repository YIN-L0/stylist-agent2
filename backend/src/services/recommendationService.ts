import { database, menDatabase } from '../database/database'
import { openaiService, ScenarioAnalysis } from './openaiService'
import { OutfitRecommendation, ProductItem, VirtualTryOnResult } from '../types'
import { virtualTryOnService } from './virtualTryOnService'
import { csvDataService } from './csvDataService'

export class RecommendationService {
  private toChineseOccasions(occs: string[] | undefined): string[] {
    if (!occs || occs.length === 0) return []
    const map: Record<string, string> = {
      'Office': '办公室',
      'Business Dinner': '商务晚宴',
      'Date Night': '约会夜晚',
      'Cocktail': '鸡尾酒活动',
      'Party': '派对活动',
      'Celebration': '庆祝活动',
      'Everyday Casual': '日常休闲',
      'Travel': '旅行',
      'Weekend Brunch': '周末早午餐',
      'Festival': '节日活动',
      'Concert': '音乐会',
      'Interview': '面试'
    }
    return occs.map(o => map[o] || o)
  }

  private buildFabReason(
    scenario: string,
    analysisOccs: string[] | undefined,
    items: any
  ): string | null {
    const fabParts: string[] = []
    if (items?.dress?.fab) fabParts.push(items.dress.fab)
    if (items?.upper?.fab) fabParts.push(items.upper.fab)
    if (items?.lower?.fab) fabParts.push(items.lower.fab)

    if (fabParts.length === 0) return null

    const cnOccs = this.toChineseOccasions(analysisOccs)
    const occText = cnOccs.length ? cnOccs.join('、') : '日常'
    
    // 清理FAB内容：移除"设计FAB:"、"面料FAB:"、"工艺FAB:"等标题
    const cleanedParts = fabParts.map(part => {
      return part
        .replace(/设计FAB：/g, '')
        .replace(/面料FAB：/g, '')
        .replace(/工艺FAB：/g, '')
        .replace(/FAB：/g, '')
        .replace(/；/g, '，')
        .trim()
    })
    
    const merged = cleanedParts.join('。')
    return `针对"${scenario}"，这套搭配在${occText}场合表现出色。${merged}这样的设计既保证了舒适性，又完美契合了您的需求。`
  }
  // 备用场景分析逻辑
  private fallbackAnalysis(scenario: string): ScenarioAnalysis {
    const lowerScenario = scenario.toLowerCase()
    
    const occasionKeywords: Record<string, string[]> = {
      '办公室': ['公司', '办公', '工作', '上班', '会议', '面试', '职场', '通勤'],
      '商务晚宴': ['商务', '晚宴', '正式', '商务餐叙', '商务餐会'],
      '约会夜晚': ['约会', '浪漫', '晚餐', '电影', '情侣', '男朋友', '女朋友', '情人节'],
      '鸡尾酒活动': ['鸡尾酒', '酒会', '社交', '沙龙', 'party'],
      '派对活动': ['聚会', '派对', '生日', '狂欢', '夜店', '酒吧', 'club'],
      '庆祝活动': ['庆祝', '庆典', '纪念日', '周年', '祝贺'],
      '日常休闲': ['休闲', '放松', '咖啡', '购物', '逛街', '日常', '朋友聚会'],
      '周末早午餐': ['早午餐', '周末', 'brunch', '咖啡厅'],
      '旅行': ['旅行', '度假', '出游', '旅游', 'citywalk'],
      '节日活动': ['节日', '庆典', '活动', '年会'],
      '音乐会': ['音乐会', '演出', '演唱会', 'livehouse'],
      '面试': ['面试', '求职', '应聘']
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
      detectedOccasions.push('日常休闲')
      keywords.push('休闲', '日常')
    }
    
    // 确定正式程度
    let formality = 'Casual'
    if (lowerScenario.includes('正式') || lowerScenario.includes('商务') || lowerScenario.includes('晚宴') || lowerScenario.includes('面试')) {
      formality = 'Formal'
    } else if (lowerScenario.includes('鸡尾酒') || lowerScenario.includes('约会') || lowerScenario.includes('庆祝')) {
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
  private createProductItem(productId: string, type: string, fab?: string): ProductItem {
    return {
      productId,
      type,
      imageUrl: this.generateImageUrl(productId),
      productUrl: this.generateProductUrl(productId),
      fab
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

  async getRecommendations(scenario: string, skipVirtualTryOn: boolean = true, gender: 'women' | 'men' = 'women'): Promise<{
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
      console.log('🎨 Colors analysis:', analysis.colors)
      } catch (aiError) {
        console.warn('AI analysis failed, using fallback logic:', aiError)
        // 备用分析逻辑
        analysis = this.fallbackAnalysis(scenario)
        console.log('Fallback analysis result:', analysis)
      }

      // 2. 从数据库搜索匹配的服装
      console.log('🔍 Searching for matching outfits...')
      console.log('Analysis occasions:', analysis.occasions)
      // 将中文场合扩展为中英双语关键词，兼容旧数据
      const occasionMap: Record<string, string[]> = {
        '办公室': ['办公室', 'Office'],
        '商务晚宴': ['商务晚宴', 'Business Dinner'],
        '约会夜晚': ['约会夜晚', 'Date Night'],
        '鸡尾酒活动': ['鸡尾酒活动', 'Cocktail'],
        '派对活动': ['派对活动', 'Party'],
        '庆祝活动': ['庆祝活动', 'Celebration'],
        '日常休闲': ['日常休闲', 'Everyday Casual'],
        '旅行': ['旅行', 'Travel'],
        '周末早午餐': ['周末早午餐', 'Weekend Brunch'],
        '节日活动': ['节日活动', 'Festival'],
        '音乐会': ['音乐会', 'Concert'],
        '面试': ['面试', 'Interview']
      }
      const expandOccasions = (occs: string[] | undefined): string[] => {
        if (!occs || occs.length === 0) return []
        const result: string[] = []
        for (const occ of occs) {
          const mapped = occasionMap[occ]
          if (mapped) {
            result.push(...mapped)
          } else {
            // 若本身是英文，尝试反向加入中文
            const reverse = Object.entries(occasionMap).find(([, vals]) => vals.includes(occ))
            if (reverse) {
              result.push(...reverse[1])
            } else {
              result.push(occ)
            }
          }
        }
        // 去重
        return Array.from(new Set(result))
      }
      const searchOccasions = expandOccasions(analysis.occasions)

      // 根据性别选择对应的数据库实例
      const targetDb = gender === 'men' ? menDatabase : database
      
      let outfits = await targetDb.searchOutfits(
        searchOccasions,
        [], // 不再使用styles参数
        10000
      )
      console.log('Found outfits:', outfits.length)

      // 如果有颜色偏好，使用颜色筛选进一步过滤搭配
      if (analysis.colors && (analysis.colors.preferred || analysis.colors.excluded)) {
        console.log('🎨 Applying color filtering:', analysis.colors)
        
        // 使用CSV服务进行颜色筛选
        const colorFilteredDetails = await csvDataService.searchByContent(
          scenario,
          analysis.keywords,
          gender,
          outfits.length, // 保持当前找到的数量
          analysis.colors
        )
        
        // 将颜色筛选后的结果映射回outfit对象
        const filteredOutfitNames = new Set(colorFilteredDetails.map(detail => detail.id))
        outfits = outfits.filter(outfit => filteredOutfitNames.has(outfit.outfit_name))
        
        console.log('After color filtering:', outfits.length, 'outfits remaining')
      }

      if (outfits.length === 0) {
        console.warn('No outfits found for occasions, trying relaxed fallback...')
        const fallbackOccs = expandOccasions(['日常休闲', '周末早午餐'])
        outfits = await targetDb.searchOutfits(fallbackOccs, [], 10000)
        console.log('Fallback found outfits:', outfits.length)
        if (outfits.length === 0) {
          throw new Error('No matching outfits found')
        }
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

      // 5. 限制返回数量：只返回前9个最佳匹配，减少AI调用次数
      const selectedOutfits = this.selectDiverseOutfits(sortedOutfits, 9)

      // 6. 生成推荐结果
      const recommendations: OutfitRecommendation[] = []

      for (const { outfit, score } of selectedOutfits) {
        const items: any = {}

        // 为每个服装单品创建产品项目
        if (outfit.jacket_id) {
          items.jacket = this.createProductItem(outfit.jacket_id, 'jacket')
        }
        if (outfit.upper_id) {
          items.upper = this.createProductItem(outfit.upper_id, 'upper', outfit.upper_fab)
        }
        if (outfit.lower_id) {
          items.lower = this.createProductItem(outfit.lower_id, 'lower', outfit.lower_fab)
        }
        if (outfit.dress_id) {
          items.dress = this.createProductItem(outfit.dress_id, 'dress', outfit.dress_fab)
        }
        if (outfit.shoes_id) {
          items.shoes = this.createProductItem(outfit.shoes_id, 'shoes')
        }

        // 获取详细搭配信息并生成推荐理由
        let reason: string
        try {
          // 获取搭配的详细信息（CSV服务应该已在服务启动时初始化）
          const outfitDetails = csvDataService.getOutfitDetails(outfit.outfit_name, gender)
          
          if (outfitDetails) {
            console.log('🎨 Using detailed outfit information for AI reasoning')
            // 使用详细搭配信息生成AI推荐理由
            const aiReason = await openaiService.generateRecommendationReason(scenario, outfit, analysis, outfitDetails)
            reason = aiReason
          } else {
            console.log('⚠️ No detailed outfit info found, using FAB-based reasoning')
            // 回退到原有的FAB推理方式
            const fabReason = this.buildFabReason(scenario, analysis.occasions, items)
            if (fabReason) {
              reason = fabReason
            } else {
              const aiReason = await openaiService.generateRecommendationReason(scenario, outfit, analysis)
              reason = aiReason
            }
          }
        } catch (reasonError) {
          console.warn('AI reason generation failed, using fallback:', reasonError)
          const fallbackReason = this.fallbackReason(scenario, outfit, Math.round(score * 100))
          const fabReason = this.buildFabReason(scenario, analysis.occasions, items)
          if (fabReason) {
            reason = fabReason
          } else {
            reason = fallbackReason
          }
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
            occasions: outfit.occasions ? this.toChineseOccasions(outfit.occasions.split(',').map((o: string) => o.trim())) : []
          },
          // 内部排序依据为匹配度，但不对外暴露
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
