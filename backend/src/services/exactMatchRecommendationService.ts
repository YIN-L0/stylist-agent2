import { csvDataService, OutfitDetailData } from './csvDataService'
import { database, menDatabase } from '../database/database'
import { OutfitRecommendation, ProductItem } from '../types'

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

  // 精确匹配产品名称
  private exactMatchProducts(outfit: OutfitDetailData, targetProducts: { [key: string]: string[] }): string[] {
    const matches: string[] = []

    Object.entries(targetProducts).forEach(([category, keywords]) => {
      let categoryMatched = false

      switch (category) {
        case 'dress':
          if (outfit.DressName) {
            keywords.forEach(keyword => {
              if (outfit.DressName?.toLowerCase().includes(keyword.toLowerCase())) {
                matches.push(`连衣裙: ${outfit.DressName}`)
                categoryMatched = true
              }
            })
          }
          break

        case 'upper':
          if (outfit.UpperName) {
            keywords.forEach(keyword => {
              if (outfit.UpperName?.toLowerCase().includes(keyword.toLowerCase())) {
                matches.push(`上衣: ${outfit.UpperName}`)
                categoryMatched = true
              }
            })
          }
          break

        case 'lower':
          if (outfit.LowerName) {
            keywords.forEach(keyword => {
              if (outfit.LowerName?.toLowerCase().includes(keyword.toLowerCase())) {
                matches.push(`下装: ${outfit.LowerName}`)
                categoryMatched = true
              }
            })
          }
          break

        case 'jacket':
          if (outfit.JacketName) {
            keywords.forEach(keyword => {
              if (outfit.JacketName?.toLowerCase().includes(keyword.toLowerCase())) {
                matches.push(`夹克: ${outfit.JacketName}`)
                categoryMatched = true
              }
            })
          }
          break

        case 'shoes':
          if (outfit.ShoesName) {
            keywords.forEach(keyword => {
              if (outfit.ShoesName?.toLowerCase().includes(keyword.toLowerCase())) {
                matches.push(`鞋子: ${outfit.ShoesName}`)
                categoryMatched = true
              }
            })
          }
          break
      }
    })

    return matches
  }

  // 精确匹配颜色
  private exactMatchColors(outfit: OutfitDetailData, targetColors: string[]): string[] {
    const matches: string[] = []

    const outfitColors = [
      { name: 'UpperColor', value: outfit.UpperColor },
      { name: 'LowerColor', value: outfit.LowerColor },
      { name: 'DressColor', value: outfit.DressColor },
      { name: 'JacketColor', value: outfit.JacketColor },
      { name: 'ShoesColor', value: outfit.ShoesColor }
    ].filter(item => item.value)

    targetColors.forEach(targetColor => {
      outfitColors.forEach(({ name, value }) => {
        if (value?.toLowerCase().includes(targetColor.toLowerCase())) {
          matches.push(`${name}: ${value}`)
        }
      })
    })

    return matches
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

  // 主要的精确匹配推荐方法
  async getExactMatchRecommendations(prompt: string, gender: 'women' | 'men' = 'women'): Promise<OutfitRecommendation[]> {
    try {
      console.log('🔍 Starting exact match recommendation for:', prompt)

      // 确保CSV数据服务已初始化
      await csvDataService.initialize()

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

        // 匹配顺序1: 产品名称 (权重最高)
        if (Object.keys(targetProducts).length > 0) {
          const productMatches = this.exactMatchProducts(outfit, targetProducts)
          if (productMatches.length > 0) {
            score += productMatches.length * 40 // 每个产品匹配40分
            matchDetails.productMatches = productMatches
            console.log(`✅ ${outfit.id} - Product matches:`, productMatches)
          }
        }

        // 匹配顺序2: 颜色 (权重第二)
        if (targetColors.length > 0) {
          const colorMatches = this.exactMatchColors(outfit, targetColors)
          if (colorMatches.length > 0) {
            score += colorMatches.length * 30 // 每个颜色匹配30分
            matchDetails.colorMatches = colorMatches
            console.log(`🎨 ${outfit.id} - Color matches:`, colorMatches)
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

      // 4. 按分数排序，返回前9个
      const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, 9)

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

        // 构建推荐理由
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
}

export const exactMatchRecommendationService = new ExactMatchRecommendationService()