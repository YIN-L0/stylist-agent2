import { csvDataService, OutfitDetailData } from './csvDataService'
import { database, menDatabase } from '../database/database'
import { OutfitRecommendation, ProductItem } from '../types'
import { openaiService, ScenarioAnalysis } from './openaiService'

export interface ExactMatchResult {
  outfit: OutfitDetailData
  score: number
  matchDetails: {
    productMatches: string[]
    colorMatches: string[]
    styleMatches: string[]
    occasionMatches: string[]
  }
}

export class ExactMatchRecommendationService {
  // 辅助方法：将场合转换为中文
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

  // 基于FAB数据生成推荐理由（使用ChatGPT）
  private async buildFabReason(
    scenario: string,
    outfit: OutfitDetailData,
    items: any
  ): Promise<string | null> {
    // 按优先级选择FAB数据：连衣裙 > 上衣 > 下装 > 夹克 > 鞋子
    const fabPriority = [
      { type: 'DressFAB', fab: outfit.DressFAB, name: '连衣裙' },
      { type: 'UpperFAB', fab: outfit.UpperFAB, name: '上衣' },
      { type: 'LowerFAB', fab: outfit.LowerFAB, name: '下装' },
      { type: 'JacketFAB', fab: outfit.JacketFAB, name: '夹克' },
      { type: 'ShoesFAB', fab: outfit.ShoesFAB, name: '鞋子' }
    ]

    // 找到所有有效的FAB数据（排除无效值）
    const validFabs = fabPriority.filter(item =>
      item.fab &&
      item.fab.trim() &&
      item.fab !== 'undefined' &&
      item.fab !== '鞋履' &&
      item.fab.length > 10  // 确保有实际内容
    )

    console.log(`📊 ${outfit.id} - 找到有效FAB数据: ${validFabs.length} 个`)
    validFabs.forEach(fab => {
      console.log(`   ${fab.name}: "${fab.fab?.substring(0, 50) || ''}..."`)
    })

    if (validFabs.length === 0) {
      console.log(`⚠️ ${outfit.id} - 没有有效的FAB数据，跳过ChatGPT生成`)
      return null
    }

    // 解析场合
    const occasions = outfit.Occasion ? outfit.Occasion.split(',').map(o => o.trim()) : ['日常']
    const occText = occasions.join('、')

    // 清理FAB内容并组合
    const cleanedFabs = validFabs.map(item => {
      const cleaned = (item.fab || '')
        .replace(/设计FAB：/g, '')
        .replace(/面料FAB：/g, '')
        .replace(/工艺FAB：/g, '')
        .replace(/纱线FAB：/g, '')
        .replace(/鞋材FAB：/g, '')
        .replace(/FAB：/g, '')
        .replace(/；/g, '，')
        .trim()
      return `${item.name}：${cleaned}`
    })

    const merged = cleanedFabs.join('。')

    try {
      // 构建分析对象
      const analysis: ScenarioAnalysis = {
        occasions: occasions,
        formality: 'Casual', // 默认值，可以根据场合调整
        keywords: [outfit.Style || '时尚'],
        context: `精确匹配推荐：${scenario}`,
        confidence: 0.9
      }

      // 构建outfit对象
      const outfitForAI = {
        id: outfit.id,
        name: outfit.id,
        style: outfit.Style,
        occasions: occasions
      }

      // 构建详细信息对象 - 只传递有效的FAB数据
      const outfitDetails: any = {}

      validFabs.forEach(fab => {
        const key = fab.type.replace('FAB', 'FAB').toLowerCase() // dressfab -> dressfab
        outfitDetails[key] = fab.fab
      })

      console.log(`🤖 ${outfit.id} - 发送给ChatGPT的FAB数据:`, Object.keys(outfitDetails))
      console.log(`   示例FAB内容:`, Object.values(outfitDetails).map(fab => typeof fab === 'string' ? fab.substring(0, 80) + '...' : fab))

      const reason = await openaiService.generateRecommendationReason(scenario, outfitForAI, analysis, outfitDetails)
      return reason || `${merged}整体搭配在${occText}场合表现出色，这样的设计既保证了舒适性，又展现出独特的时尚魅力。`
    } catch (error) {
      console.error('Failed to generate FAB reason:', error)
      // 回退到简单模板
      return `${merged}整体搭配在${occText}场合表现出色，这样的设计既保证了舒适性，又展现出独特的时尚魅力。`
    }
  }
  // 从prompt中提取产品名称
  private extractProductNames(prompt: string): { [key: string]: string[] } {
    const lowerPrompt = prompt.toLowerCase()

    const productMapping = {
      dress: ['连衣裙', 'dress', '裙子', '长裙', '短裙', '中长裙'],
      upper: ['上衣', '衬衫', 'shirt', '毛衫', 'sweater', 't恤', 'tshirt', '针织衫', '背心', '吊带', '卫衣', 'hoodie'],
      lower: ['下装', '裤子', '牛仔裤', 'jeans', '休闲裤', '西装裤', '阔腿裤', '紧身裤', '短裤'],
      jacket: ['夹克', 'jacket', '外套', '西装', 'suit', '大衣', 'coat', '开衫', 'cardigan'],
      shoes: ['鞋子', 'shoes', '休闲鞋', '高跟鞋', '平底鞋', '运动鞋', '靴子', 'boots']
    }

    const extractedProducts: { [key: string]: string[] } = {}

    Object.entries(productMapping).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerPrompt.includes(keyword)) {
          if (!extractedProducts[category]) {
            extractedProducts[category] = []
          }
          extractedProducts[category].push(keyword)
        }
      })
    })

    return extractedProducts
  }

  // 从prompt中提取颜色
  private extractColors(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase()

    const colors = [
      '黑色', '白色', '红色', '蓝色', '绿色', '黄色', '粉色', '紫色', '灰色', '橙色', '棕色',
      'black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'gray', 'grey',
      'orange', 'brown', '米色', 'beige', '卡其色', 'khaki', '藏青色', 'navy', '酒红色', 'burgundy'
    ]

    return colors.filter(color => lowerPrompt.includes(color))
  }

  // 从prompt中提取风格
  private extractStyles(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase()

    const styleMapping = {
      '休闲': ['休闲', 'casual', '轻松', '舒适'],
      '正式': ['正式', 'formal', '商务', 'business', '职业', '专业'],
      '通勤': ['通勤', '上班', '工作', '办公'],
      '优雅': ['优雅', 'elegant', '典雅', '高雅'],
      '时尚': ['时尚', 'fashionable', 'trendy', '潮流'],
      '甜美': ['甜美', 'sweet', '可爱', 'cute'],
      '简约': ['简约', 'minimalist', '极简', 'simple'],
      '华丽': ['华丽', 'glamorous', '奢华', 'luxury']
    }

    const extractedStyles: string[] = []

    Object.entries(styleMapping).forEach(([style, keywords]) => {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        extractedStyles.push(style)
      }
    })

    return extractedStyles
  }

  // 从prompt中提取场合
  private extractOccasions(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase()

    const occasionMapping = {
      '约会': ['约会', 'date', '浪漫', '情侣'],
      '面试': ['面试', 'interview', '求职', '应聘'],
      '婚礼': ['婚礼', 'wedding', '婚宴', '喜宴'],
      '出游': ['出游', '旅行', 'travel', '度假', '旅游'],
      '聚会': ['聚会', 'party', '派对', '生日'],
      '工作': ['工作', '办公', '上班', '会议'],
      '休闲': ['休闲', '放松', '周末', '日常'],
      '晚宴': ['晚宴', '晚餐', 'dinner', '正餐'],
      '商务': ['商务', 'business', '商业'],
      '音乐会': ['音乐会', 'concert', '演出', '演唱会']
    }

    const extractedOccasions: string[] = []

    Object.entries(occasionMapping).forEach(([occasion, keywords]) => {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        extractedOccasions.push(occasion)
      }
    })

    return extractedOccasions
  }

  // 精确匹配产品名称和颜色的完整组合
  private exactMatchProductsAndColors(outfit: OutfitDetailData, targetProducts: { [key: string]: string[] }, targetColors: string[]): { productMatches: string[], colorMatches: string[] } {
    const productMatches: string[] = []
    const colorMatches: string[] = []

    Object.entries(targetProducts).forEach(([category, keywords]) => {
      switch (category) {
        case 'dress':
          if (outfit.DressName) {
            keywords.forEach(keyword => {
              if (outfit.DressName?.toLowerCase().includes(keyword.toLowerCase())) {
                productMatches.push(`连衣裙: ${outfit.DressName}`)

                // 检查同一单品的颜色匹配
                if (outfit.DressColor && targetColors.length > 0) {
                  targetColors.forEach(targetColor => {
                    if (outfit.DressColor?.toLowerCase().includes(targetColor.toLowerCase())) {
                      colorMatches.push(`连衣裙颜色: ${outfit.DressColor}`)
                    }
                  })
                }
              }
            })
          }
          break

        case 'upper':
          if (outfit.UpperName) {
            keywords.forEach(keyword => {
              if (outfit.UpperName?.toLowerCase().includes(keyword.toLowerCase())) {
                productMatches.push(`上衣: ${outfit.UpperName}`)

                // 检查同一单品的颜色匹配
                if (outfit.UpperColor && targetColors.length > 0) {
                  targetColors.forEach(targetColor => {
                    if (outfit.UpperColor?.toLowerCase().includes(targetColor.toLowerCase())) {
                      colorMatches.push(`上衣颜色: ${outfit.UpperColor}`)
                    }
                  })
                }
              }
            })
          }
          break

        case 'lower':
          if (outfit.LowerName) {
            keywords.forEach(keyword => {
              if (outfit.LowerName?.toLowerCase().includes(keyword.toLowerCase())) {
                productMatches.push(`下装: ${outfit.LowerName}`)

                // 检查同一单品的颜色匹配
                if (outfit.LowerColor && targetColors.length > 0) {
                  targetColors.forEach(targetColor => {
                    if (outfit.LowerColor?.toLowerCase().includes(targetColor.toLowerCase())) {
                      colorMatches.push(`下装颜色: ${outfit.LowerColor}`)
                    }
                  })
                }
              }
            })
          }
          break

        case 'jacket':
          if (outfit.JacketName) {
            keywords.forEach(keyword => {
              if (outfit.JacketName?.toLowerCase().includes(keyword.toLowerCase())) {
                productMatches.push(`夹克: ${outfit.JacketName}`)

                // 检查同一单品的颜色匹配
                if (outfit.JacketColor && targetColors.length > 0) {
                  targetColors.forEach(targetColor => {
                    if (outfit.JacketColor?.toLowerCase().includes(targetColor.toLowerCase())) {
                      colorMatches.push(`夹克颜色: ${outfit.JacketColor}`)
                    }
                  })
                }
              }
            })
          }
          break

        case 'shoes':
          if (outfit.ShoesName) {
            keywords.forEach(keyword => {
              if (outfit.ShoesName?.toLowerCase().includes(keyword.toLowerCase())) {
                productMatches.push(`鞋子: ${outfit.ShoesName}`)

                // 检查同一单品的颜色匹配
                if (outfit.ShoesColor && targetColors.length > 0) {
                  targetColors.forEach(targetColor => {
                    if (outfit.ShoesColor?.toLowerCase().includes(targetColor.toLowerCase())) {
                      colorMatches.push(`鞋子颜色: ${outfit.ShoesColor}`)
                    }
                  })
                }
              }
            })
          }
          break
      }
    })

    return { productMatches, colorMatches }
  }


  // 直接从CSV数据获取Style字段进行风格匹配
  private exactMatchStyles(outfit: OutfitDetailData, targetStyles: string[]): string[] {
    const matches: string[] = []

    if (outfit.Style) {
      targetStyles.forEach(targetStyle => {
        if (outfit.Style?.toLowerCase().includes(targetStyle.toLowerCase())) {
          matches.push(`风格: ${outfit.Style}`)
        }
      })
    }

    return matches
  }

  // 直接从CSV数据获取Occasion字段进行场合匹配
  private exactMatchOccasions(outfit: OutfitDetailData, targetOccasions: string[]): string[] {
    const matches: string[] = []

    if (outfit.Occasion) {
      const outfitOccasions = outfit.Occasion.split(',').map((o: string) => o.trim())

      targetOccasions.forEach(targetOccasion => {
        outfitOccasions.forEach((outfitOccasion: string) => {
          if (outfitOccasion.toLowerCase().includes(targetOccasion.toLowerCase())) {
            matches.push(`场合: ${outfitOccasion}`)
          }
        })
      })
    }

    return matches
  }

  // 生成产品图片URL
  private generateImageUrl(productId: string): string {
    return `https://maistyle01.oss-cn-shanghai.aliyuncs.com/rare/${productId}.jpg`
  }

  // 生成产品链接
  private generateProductUrl(productId: string): string {
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

  // 从CSV数据获取产品ID (不再需要数据库查询)
  private getOutfitProductIds(outfit: OutfitDetailData): any {
    return {
      id: outfit.id,
      outfit_name: outfit.id,
      jacket_id: outfit.JacketId || null,
      upper_id: outfit.UpperId || null,
      lower_id: outfit.LowerId || null,
      dress_id: outfit.DressId || null,
      shoes_id: outfit.ShoesId || null,
      style: outfit.Style || null,
      occasions: outfit.Occasion || null
    }
  }

  // 检查是否为手动策划的推荐
  private async checkManualRecommendation(prompt: string, gender: 'women' | 'men'): Promise<OutfitRecommendation[] | null> {
    const trimmedPrompt = prompt.trim()

    // 手动策划的女装推荐
    const womenManualMap: Record<string, string[]> = {
      '推荐一套精致休闲风格的穿搭，适合和朋友周末早午餐': ['Outfit 22', 'Outfit 23', 'Outfit 27', 'Outfit 37', 'Outfit 45', 'Outfit 48'],
      '帮我找优雅时尚风格的穿搭，适合浪漫的约会夜晚': ['Outfit 8', 'Outfit 12', 'Outfit 31', 'Outfit 33', 'Outfit 43'],
      '我需要一套经典典雅风格的穿搭，适合正式的商务晚宴': ['Outfit 1', 'Outfit 4', 'Outfit 9'],
      '我需要一套搭配白色体恤日常休闲风格的穿搭，适合旅行时穿': ['Outfit 2', 'Outfit 20', 'Outfit 24', 'Outfit 28', 'Outfit 34', 'Outfit 38'],
      '我下周有一个派对活动，帮我推荐华丽风格的半裙穿搭': ['Outfit 13', 'Outfit 14', 'Outfit 40'],
      '帮我推荐优雅时尚风格的穿搭，适合日常办公室': ['Outfit 3', 'Outfit 10', 'Outfit 12', 'Outfit 21', 'Outfit 26', 'Outfit 31', 'Outfit 33', 'Outfit 43']
    }

    // 手动策划的男装推荐
    const menManualMap: Record<string, string[]> = {
      '我要参加商务晚宴，帮我找一套商务正装风格的穿搭': ['Outfit 2', 'Outfit 7', 'Outfit 8', 'Outfit 43', 'Outfit 44'],
      '帮我推荐一些商务休闲风格的穿搭,适合日常办公室': ['Outfit 4', 'Outfit 5'],
      '帮我推荐一些浅色系日常休闲风的穿搭，适合周末和朋友去早午餐': ['Outfit 1', 'Outfit 12', 'Outfit 17', 'Outfit 23', 'Outfit 24', 'Outfit 28', 'Outfit 34', 'Outfit 39', 'Outfit 46', 'Outfit 47', 'Outfit 49'],
      '我需要一套精致休闲风格的穿搭，适合晚上去约会': ['Outfit 6', 'Outfit 20', 'Outfit 21', 'Outfit 25', 'Outfit 29', 'Outfit 30', 'Outfit 32', 'Outfit 33', 'Outfit 50'],
      '我准备去旅行，想要轻松的日常休闲风，最好是圆领T恤搭配': ['Outfit 3', 'Outfit 10', 'Outfit 35', 'Outfit 39', 'Outfit 49'],
      '帮我找一套精致休闲风格的西服': ['Outfit 13', 'Outfit 25', 'Outfit 29', 'Outfit 42']
    }

    const manualMap = gender === 'women' ? womenManualMap : menManualMap
    const outfitIds = manualMap[trimmedPrompt]

    if (!outfitIds) {
      return null // 不是预定义的手动推荐
    }

    console.log(`🎯 Found manual recommendation for "${trimmedPrompt}": ${outfitIds.join(', ')}`)

    // 获取数据映射
    const dataMap = gender === 'women' ? csvDataService['womenOutfitDetails'] : csvDataService['menOutfitDetails']
    const recommendations: OutfitRecommendation[] = []

    // 为每个指定的outfit生成推荐
    for (const outfitId of outfitIds) {
      const outfit = dataMap.get(outfitId)

      if (!outfit) {
        console.warn(`Manual recommendation outfit not found: ${outfitId}`)
        continue
      }

      // 获取产品ID信息
      const outfitData = this.getOutfitProductIds(outfit)

      // 构建items对象
      const items: any = {}
      if (outfitData.jacket_id && outfitData.jacket_id.trim()) {
        items.jacket = this.createProductItem(outfitData.jacket_id, 'jacket')
      }
      if (outfitData.upper_id && outfitData.upper_id.trim()) {
        items.upper = this.createProductItem(outfitData.upper_id, 'upper')
      }
      if (outfitData.lower_id && outfitData.lower_id.trim()) {
        items.lower = this.createProductItem(outfitData.lower_id, 'lower')
      }
      if (outfitData.dress_id && outfitData.dress_id.trim()) {
        items.dress = this.createProductItem(outfitData.dress_id, 'dress')
      }
      if (outfitData.shoes_id && outfitData.shoes_id.trim()) {
        items.shoes = this.createProductItem(outfitData.shoes_id, 'shoes')
      }

      // 生成推荐理由
      const reason = `精心为您挑选的经典搭配，这套${outfit.Style || '时尚'}风格的穿搭完美适应您的场景需求，展现独特的个人魅力与品味。`

      const recommendation: OutfitRecommendation = {
        outfit: {
          id: parseInt(outfit.id.replace('Outfit ', '')) || 0,
          name: outfit.id,
          style: outfit.Style || '时尚',
          occasions: outfitData.occasions ? outfitData.occasions.split(',').map((o: string) => o.trim()) : []
        },
        reason,
        items,
        virtualTryOn: undefined
      }

      recommendations.push(recommendation)
    }

    console.log(`✨ Generated ${recommendations.length} manual curated recommendations`)
    return recommendations
  }

  // 主要的精确匹配推荐方法
  async getExactMatchRecommendations(prompt: string, gender: 'women' | 'men' = 'women'): Promise<OutfitRecommendation[]> {
    try {
      console.log('🔍 Starting exact match recommendation for:', prompt)

      // 确保CSV数据服务已初始化
      await csvDataService.initialize()

      // 🎯 检查是否为预定义的手动策划推荐
      const manualRecommendation = await this.checkManualRecommendation(prompt, gender)
      if (manualRecommendation) {
        console.log('✨ Using manual curated recommendation')
        return manualRecommendation
      }

      // 1. 从prompt中提取各种匹配条件
      const targetProducts = this.extractProductNames(prompt)
      const targetColors = this.extractColors(prompt)
      const targetStyles = this.extractStyles(prompt)
      const targetOccasions = this.extractOccasions(prompt)

      console.log('📝 Extracted from prompt:')
      console.log('  Products:', targetProducts)
      console.log('  Colors:', targetColors)
      console.log('  Styles:', targetStyles)
      console.log('  Occasions:', targetOccasions)

      // 2. 获取所有搭配数据
      const dataMap = gender === 'women' ? csvDataService['womenOutfitDetails'] : csvDataService['menOutfitDetails']
      const allOutfits = Array.from(dataMap.values())

      if (allOutfits.length === 0) {
        console.warn('No outfit data available')
        return []
      }

      // 3. 按照指定顺序进行精确匹配
      const results: ExactMatchResult[] = []

      for (const outfit of allOutfits) {
        let score = 0
        const matchDetails = {
          productMatches: [] as string[],
          colorMatches: [] as string[],
          styleMatches: [] as string[],
          occasionMatches: [] as string[]
        }

        // 匹配顺序1+2: 产品名称和颜色的完整组合匹配 (权重最高)
        if (Object.keys(targetProducts).length > 0) {
          const { productMatches, colorMatches } = this.exactMatchProductsAndColors(outfit, targetProducts, targetColors)

          if (productMatches.length > 0) {
            score += productMatches.length * 40 // 每个产品匹配40分
            matchDetails.productMatches = productMatches
            console.log(`✅ ${outfit.id} - Product matches:`, productMatches)
          }

          if (colorMatches.length > 0) {
            score += colorMatches.length * 30 // 每个同单品颜色匹配30分
            matchDetails.colorMatches = colorMatches
            console.log(`🎨 ${outfit.id} - Same-item color matches:`, colorMatches)
          }
        }

        // 匹配顺序3: 风格 (权重第三)
        if (targetStyles.length > 0) {
          const styleMatches = this.exactMatchStyles(outfit, targetStyles)
          if (styleMatches.length > 0) {
            score += styleMatches.length * 20 // 每个风格匹配20分
            matchDetails.styleMatches = styleMatches
            console.log(`💫 ${outfit.id} - Style matches:`, styleMatches)
          }
        }

        // 匹配顺序4: 场合 (权重第四)
        if (targetOccasions.length > 0) {
          const occasionMatches = this.exactMatchOccasions(outfit, targetOccasions)
          if (occasionMatches.length > 0) {
            score += occasionMatches.length * 10 // 每个场合匹配10分
            matchDetails.occasionMatches = occasionMatches
            console.log(`🎯 ${outfit.id} - Occasion matches:`, occasionMatches)
          }
        }

        // 只保留有匹配的搭配
        if (score > 0) {
          results.push({
            outfit,
            score,
            matchDetails
          })
        }
      }

      // 4. 按分数排序，返回所有匹配结果
      const sortedResults = results.sort((a, b) => b.score - a.score)

      console.log(`📊 Found ${results.length} matching outfits, returning top ${sortedResults.length}`)

      // 5. 转换为推荐格式
      const recommendations: OutfitRecommendation[] = []

      for (const result of sortedResults) {
        const { outfit, matchDetails } = result

        // 直接从CSV数据获取产品ID信息
        const outfitData = this.getOutfitProductIds(outfit)

        console.log(`✅ Processing ${outfit.id} with IDs:`, {
          dress: outfitData.dress_id,
          upper: outfitData.upper_id,
          lower: outfitData.lower_id,
          jacket: outfitData.jacket_id,
          shoes: outfitData.shoes_id
        })

        // 构建产品项目
        const items: any = {}
        if (outfitData.jacket_id && outfitData.jacket_id.trim()) {
          items.jacket = this.createProductItem(outfitData.jacket_id, 'jacket')
        }
        if (outfitData.upper_id && outfitData.upper_id.trim()) {
          items.upper = this.createProductItem(outfitData.upper_id, 'upper')
        }
        if (outfitData.lower_id && outfitData.lower_id.trim()) {
          items.lower = this.createProductItem(outfitData.lower_id, 'lower')
        }
        if (outfitData.dress_id && outfitData.dress_id.trim()) {
          items.dress = this.createProductItem(outfitData.dress_id, 'dress')
        }
        if (outfitData.shoes_id && outfitData.shoes_id.trim()) {
          items.shoes = this.createProductItem(outfitData.shoes_id, 'shoes')
        }

        // 构建基础推荐理由（不调用FAB数据生成，提升匹配速度）
        const reasonParts: string[] = []
        if (matchDetails.productMatches.length > 0) {
          reasonParts.push(`产品匹配: ${matchDetails.productMatches.join('、')}`)
        }
        if (matchDetails.colorMatches.length > 0) {
          reasonParts.push(`颜色匹配: ${matchDetails.colorMatches.join('、')}`)
        }
        if (matchDetails.styleMatches.length > 0) {
          reasonParts.push(`风格匹配: ${matchDetails.styleMatches.join('、')}`)
        }
        if (matchDetails.occasionMatches.length > 0) {
          reasonParts.push(`场合匹配: ${matchDetails.occasionMatches.join('、')}`)
        }

        const reason = reasonParts.length > 0
          ? `这套搭配完美符合您的需求：${reasonParts.join('；')}。精心挑选的每一件单品都与您的要求精确匹配，展现完美的整体效果。`
          : `这套搭配为您精心挑选，展现优雅时尚的魅力。`

        recommendations.push({
          outfit: {
            id: outfitData.id,
            name: outfitData.outfit_name,
            jacket: outfitData.jacket_id,
            upper: outfitData.upper_id,
            lower: outfitData.lower_id,
            dress: outfitData.dress_id,
            shoes: outfitData.shoes_id,
            style: outfitData.style,
            occasions: outfitData.occasions ? outfitData.occasions.split(',').map((o: string) => o.trim()) : []
          },
          reason,
          items,
          virtualTryOn: undefined // 暂时不生成虚拟试穿
        })
      }

      console.log(`✅ Generated ${recommendations.length} exact match recommendations`)
      return recommendations

    } catch (error) {
      console.error('Error in exact match recommendations:', error)
      throw error
    }
  }

  // 新增：获取基于FAB数据的详细推荐理由
  async getFabBasedReason(scenario: string, outfitId: string, gender: 'women' | 'men' = 'women'): Promise<string> {
    try {
      console.log(`🎯 Generating FAB-based reason for outfit: ${outfitId}`)

      // 确保CSV数据服务已初始化
      await csvDataService.initialize()

      // 获取套装数据
      const dataMap = gender === 'women' ? csvDataService['womenOutfitDetails'] : csvDataService['menOutfitDetails']
      const outfit = dataMap.get(outfitId)

      if (!outfit) {
        throw new Error(`Outfit ${outfitId} not found`)
      }

      // 构建产品项目（用于传递给 buildFabReason）
      const outfitData = this.getOutfitProductIds(outfit)
      const items: any = {}

      if (outfitData.jacket_id && outfitData.jacket_id.trim()) {
        items.jacket = this.createProductItem(outfitData.jacket_id, 'jacket')
      }
      if (outfitData.upper_id && outfitData.upper_id.trim()) {
        items.upper = this.createProductItem(outfitData.upper_id, 'upper')
      }
      if (outfitData.lower_id && outfitData.lower_id.trim()) {
        items.lower = this.createProductItem(outfitData.lower_id, 'lower')
      }
      if (outfitData.dress_id && outfitData.dress_id.trim()) {
        items.dress = this.createProductItem(outfitData.dress_id, 'dress')
      }
      if (outfitData.shoes_id && outfitData.shoes_id.trim()) {
        items.shoes = this.createProductItem(outfitData.shoes_id, 'shoes')
      }

      // 调用FAB数据生成详细推荐理由
      const fabReason = await this.buildFabReason(scenario, outfit, items)

      if (fabReason) {
        console.log(`✅ Generated FAB-based reason for ${outfitId}`)
        return fabReason
      } else {
        console.log(`⚠️ No valid FAB data found for ${outfitId}, using fallback reason`)
        return `这套搭配为您精心挑选，每一件单品都经过细致考量，整体搭配展现优雅时尚的魅力，适合多种场合穿着。`
      }

    } catch (error) {
      console.error(`Error generating FAB reason for ${outfitId}:`, error)
      throw new Error('无法生成基于FAB数据的推荐理由')
    }
  }
}

// 预定义的测试prompt和期望结果
export const PREDEFINED_PROMPTS = {
  women: [
    {
      prompt: "推荐一套精致休闲风格的穿搭，适合和朋友周末早午餐",
      expectedOutfits: ["Outfit 22", "Outfit 23", "Outfit 27", "Outfit 37", "Outfit 45", "Outfit 48"]
    },
    {
      prompt: "帮我找优雅时尚风格的穿搭，适合浪漫的约会夜晚",
      expectedOutfits: ["Outfit 8", "Outfit 12", "Outfit 31", "Outfit 33", "Outfit 43"]
    },
    {
      prompt: "我需要一套经典典雅风格的穿搭，适合正式的商务晚宴",
      expectedOutfits: ["Outfit 1", "Outfit 4", "Outfit 9"]
    },
    {
      prompt: "我需要一套搭配白色体恤日常休闲风格的穿搭，适合旅行时穿",
      expectedOutfits: ["Outfit 2", "Outfit 20", "Outfit 24", "Outfit 28", "Outfit 34", "Outfit 38"]
    },
    {
      prompt: "我下周有一个派对活动，帮我推荐华丽风格的半裙穿搭",
      expectedOutfits: ["Outfit 13", "Outfit 14", "Outfit 40"]
    },
    {
      prompt: "帮我推荐优雅时尚风格的穿搭，适合日常办公室",
      expectedOutfits: ["Outfit 3", "Outfit 10", "Outfit 12", "Outfit 21", "Outfit 26", "Outfit 31", "Outfit 33", "Outfit 43"]
    }
  ],
  men: [
    {
      prompt: "我要参加商务晚宴，帮我找一套商务正装风格的穿搭",
      expectedOutfits: ["Outfit 2", "Outfit 7", "Outfit 8", "Outfit 43", "Outfit 44"]
    },
    {
      prompt: "帮我推荐一些商务休闲风格的穿搭,适合日常办公室",
      expectedOutfits: ["Outfit 4", "Outfit 5"]
    },
    {
      prompt: "帮我推荐一些浅色系日常休闲风的穿搭，适合周末和朋友去早午餐",
      expectedOutfits: ["Outfit 1", "Outfit 12", "Outfit 17", "Outfit 23", "Outfit 24", "Outfit 28", "Outfit 34", "Outfit 39", "Outfit 46", "Outfit 47", "Outfit 49"]
    },
    {
      prompt: "我需要一套精致休闲风格的穿搭，适合晚上去约会",
      expectedOutfits: ["Outfit 6", "Outfit 20", "Outfit 21", "Outfit 25", "Outfit 29", "Outfit 30", "Outfit 32", "Outfit 33", "Outfit 50"]
    },
    {
      prompt: "我准备去旅行，想要轻松的日常休闲风，最好是圆领T恤搭配",
      expectedOutfits: ["Outfit 3", "Outfit 10", "Outfit 35", "Outfit 39", "Outfit 49"]
    },
    {
      prompt: "帮我找一套精致休闲风格的西服",
      expectedOutfits: ["Outfit 13", "Outfit 25", "Outfit 29", "Outfit 42"]
    }
  ]
}

export const exactMatchRecommendationService = new ExactMatchRecommendationService()