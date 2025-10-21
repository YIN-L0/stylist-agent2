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

  // 辅助方法：根据语言翻译场合
  private translateOccasions(occs: string[] | undefined, language: 'en' | 'zh'): string[] {
    if (!occs || occs.length === 0) return []

    // 中英文双向映射
    const zhToEn: Record<string, string> = {
      '办公室': 'Office',
      '商务晚宴': 'Business Dinner',
      '约会夜晚': 'Date Night',
      '鸡尾酒活动': 'Cocktail',
      '派对活动': 'Party',
      '庆祝活动': 'Celebration',
      '日常休闲': 'Everyday Casual',
      '旅行': 'Travel',
      '周末早午餐': 'Weekend Brunch',
      '节日活动': 'Festival',
      '音乐会': 'Concert',
      '面试': 'Interview'
    }

    const enToZh: Record<string, string> = {
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

    if (language === 'en') {
      // 翻译成英文
      return occs.map(o => zhToEn[o] || o)
    } else {
      // 翻译成中文（如果已经是中文就保持）
      return occs.map(o => enToZh[o] || o)
    }
  }

  // 辅助方法：根据语言翻译风格
  private translateStyle(style: string, language: 'en' | 'zh'): string {
    // 中英文双向映射
    const zhToEn: Record<string, string> = {
      '经典': 'Classic',
      '经典典雅': 'Classic Elegant',
      '时尚': 'Chic',
      '华丽': 'Glam',
      '华丽风格': 'Glamorous',
      '商务休闲': 'Smart Casual',
      '商务正装': 'Business Formal',
      '正装': 'Formal',
      '休闲': 'Casual',
      '日常休闲': 'Casual',
      '优雅': 'Elegant',
      '优雅时尚': 'Elegant Chic',
      '潮流': 'Trendy',
      '极简': 'Minimalist',
      '精致': 'Sophisticated',
      '精致休闲': 'Sophisticated Casual',
      '波西米亚': 'Bohemian',
      '前卫': 'Edgy',
      '浪漫': 'Romantic'
    }

    const enToZh: Record<string, string> = {
      'Classic': '经典',
      'Classic Elegant': '经典典雅',
      'Chic': '时尚',
      'Glam': '华丽',
      'Glamorous': '华丽风格',
      'Smart Casual': '商务休闲',
      'Business Formal': '商务正装',
      'Formal': '正装',
      'Casual': '日常休闲',
      'Elegant': '优雅',
      'Elegant Chic': '优雅时尚',
      'Trendy': '潮流',
      'Minimalist': '极简',
      'Sophisticated': '精致',
      'Sophisticated Casual': '精致休闲',
      'Bohemian': '波西米亚',
      'Edgy': '前卫',
      'Romantic': '浪漫'
    }

    if (language === 'en') {
      // 翻译成英文
      return zhToEn[style] || style
    } else {
      // 翻译成中文（如果已经是中文就保持）
      return enToZh[style] || style
    }
  }

  // 基于FAB数据生成推荐理由（使用ChatGPT）
  private async buildFabReason(
    scenario: string,
    outfit: OutfitDetailData,
    items: any,
    language: 'en' | 'zh' = 'en'
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

      const reason = await openaiService.generateRecommendationReason(scenario, outfitForAI, analysis, outfitDetails, language)
      const fallbackText = language === 'en'
        ? `${merged}This overall combination performs excellently for ${occText} occasions. The design ensures both comfort and showcases unique fashion charm.`
        : `${merged}整体搭配在${occText}场合表现出色，这样的设计既保证了舒适性，又展现出独特的时尚魅力。`
      return reason || fallbackText
    } catch (error) {
      console.error('Failed to generate FAB reason:', error)
      // 回退到简单模板
      const fallbackText = language === 'en'
        ? `This overall combination performs excellently for ${occText} occasions. The design ensures both comfort and showcases unique fashion charm.`
        : `整体搭配在${occText}场合表现出色，这样的设计既保证了舒适性，又展现出独特的时尚魅力。`
      return fallbackText
    }
  }
  // 从prompt中提取产品名称
  private extractProductNames(prompt: string): { [key: string]: string[] } {
    const lowerPrompt = prompt.toLowerCase()

    const productMapping = {
      dress: ['连衣裙', 'dress', '裙子', '长裙', '短裙', '中长裙', '半裙'],
      upper: ['上衣', '衬衫', 'shirt', '毛衫', 'sweater', 't恤', 'tshirt', '针织衫', '背心', '吊带', '卫衣', 'hoodie', '长袖毛衫'],
      lower: ['下装', '裤子', '牛仔裤', 'jeans', '休闲裤', '西装裤', '阔腿裤', '紧身裤', '短裤', '针织裤'],
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

    // 更精确的风格匹配 - 按照具体性排序，优先匹配更具体的风格
    const specificStyleMapping = {
      // 具体的休闲风格子类别
      '精致休闲': ['精致休闲', '精致休闲风格'],
      '商务休闲': ['商务休闲', '商务休闲风格'],
      '日常休闲': ['日常休闲', '日常休闲风格'],
      '浅色系休闲': ['浅色系.*休闲', '浅色.*休闲'],
      '经典典雅': ['经典典雅', '经典典雅风格'],
      '优雅时尚': ['优雅时尚', '优雅时尚风格'],

      // 通用风格类别
      '正式': ['正式', 'formal', '商务正装', '正装'],
      '通勤': ['通勤', '上班', '工作', '办公'],
      '优雅': ['优雅', 'elegant', '典雅', '高雅'],
      '时尚': ['时尚', 'fashionable', 'trendy', '潮流'],
      '甜美': ['甜美', 'sweet', '可爱', 'cute'],
      '简约': ['简约', 'minimalist', '极简', 'simple'],
      '华丽': ['华丽', 'glamorous', '奢华', 'luxury'],

      // 通用休闲（优先级最低）
      '休闲': ['休闲', 'casual', '轻松', '舒适']
    }

    const extractedStyles: string[] = []

    // 按顺序匹配，优先匹配更具体的风格
    Object.entries(specificStyleMapping).forEach(([style, keywords]) => {
      keywords.forEach(keyword => {
        if (keyword.includes('.*')) {
          // 正则表达式匹配
          const regex = new RegExp(keyword, 'i')
          if (regex.test(prompt)) {
            extractedStyles.push(style)
          }
        } else {
          // 直接字符串匹配
          if (lowerPrompt.includes(keyword.toLowerCase())) {
            extractedStyles.push(style)
          }
        }
      })
    })

    // 去重并返回
    return [...new Set(extractedStyles)]
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

    // 获取完整的产品映射
    const productMapping = {
      dress: ['连衣裙', 'dress', '裙子', '长裙', '短裙', '中长裙', '半裙'],
      upper: ['上衣', '衬衫', 'shirt', '毛衫', 'sweater', 't恤', 'tshirt', '针织衫', '背心', '吊带', '卫衣', 'hoodie', '长袖毛衫'],
      lower: ['下装', '裤子', '牛仔裤', 'jeans', '休闲裤', '西装裤', '阔腿裤', '紧身裤', '短裤', '针织裤'],
      jacket: ['夹克', 'jacket', '外套', '西装', 'suit', '大衣', 'coat', '开衫', 'cardigan'],
      shoes: ['鞋子', 'shoes', '休闲鞋', '高跟鞋', '平底鞋', '运动鞋', '靴子', 'boots']
    }


    Object.entries(targetProducts).forEach(([category, userKeywords]) => {
      const categoryMapping = productMapping[category as keyof typeof productMapping] || []

      switch (category) {
        case 'dress':
          if (outfit.DressName) {
            // 检查CSV产品名是否包含映射中的任何关键词
            const match = categoryMapping.some(mappedKeyword =>
              outfit.DressName?.toLowerCase().includes(mappedKeyword.toLowerCase())
            )

            if (match) {
              productMatches.push(`连衣裙: ${outfit.DressName}`)

              // 检查同一单品的颜色匹配
              if (outfit.DressColor && targetColors.length > 0) {
                targetColors.forEach(targetColor => {
                  const colorMatch = outfit.DressColor?.toLowerCase().includes(targetColor.toLowerCase())
                  if (colorMatch) {
                    colorMatches.push(`连衣裙颜色: ${outfit.DressColor}`)
                  }
                })
              }
            }
          }
          break

        case 'upper':
          if (outfit.UpperName) {
            // 检查CSV产品名是否包含映射中的任何关键词
            const match = categoryMapping.some(mappedKeyword =>
              outfit.UpperName?.toLowerCase().includes(mappedKeyword.toLowerCase())
            )

            if (match) {
              productMatches.push(`上衣: ${outfit.UpperName}`)

              // 检查同一单品的颜色匹配
              if (outfit.UpperColor && targetColors.length > 0) {
                targetColors.forEach(targetColor => {
                  const colorMatch = outfit.UpperColor?.toLowerCase().includes(targetColor.toLowerCase())
                  if (colorMatch) {
                    colorMatches.push(`上衣颜色: ${outfit.UpperColor}`)
                  }
                })
              }
            }
          }
          break

        case 'lower':
          if (outfit.LowerName) {
            const match = categoryMapping.some(mappedKeyword =>
              outfit.LowerName?.toLowerCase().includes(mappedKeyword.toLowerCase())
            )

            if (match) {
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
          }
          break

        case 'jacket':
          if (outfit.JacketName) {
            const match = categoryMapping.some(mappedKeyword =>
              outfit.JacketName?.toLowerCase().includes(mappedKeyword.toLowerCase())
            )

            if (match) {
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
          }
          break

        case 'shoes':
          if (outfit.ShoesName) {
            const match = categoryMapping.some(mappedKeyword =>
              outfit.ShoesName?.toLowerCase().includes(mappedKeyword.toLowerCase())
            )

            if (match) {
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
      bags_id: outfit.BagsId || null,
      style: outfit.Style || null,
      occasions: outfit.Occasion || null
    }
  }

  // 检查是否为手动策划的推荐
  private async checkManualRecommendation(prompt: string, gender: 'women' | 'men', language: 'en' | 'zh' = 'en'): Promise<OutfitRecommendation[] | null> {
    const trimmedPrompt = prompt.trim()

    // 手动策划的女装推荐 (严格按照用户指定的outfit number) - 中文版
    const womenManualMapZh: Record<string, string[]> = {
      '推荐一套精致休闲风格的穿搭，适合和朋友周末早午餐': ['Outfit 22', 'Outfit 27', 'Outfit 43', 'Outfit 45'],
      '帮我找优雅时尚风格的穿搭，适合浪漫的约会夜晚': ['Outfit 8', 'Outfit 12', 'Outfit 33', 'Outfit 40'],
      '我需要一套经典典雅风格的穿搭，适合正式的商务晚宴': ['Outfit 1', 'Outfit 4', 'Outfit 9'],
      '我需要一套搭配白色体恤日常休闲风格的穿搭，适合旅行时穿': ['Outfit 20', 'Outfit 24', 'Outfit 28', 'Outfit 34', 'Outfit 38'],
      '我下周有一个派对活动，帮我推荐华丽风格的半裙穿搭': ['Outfit 13', 'Outfit 14', 'Outfit 40'],
      '帮我推荐优雅时尚风格的穿搭，适合日常办公室': ['Outfit 3', 'Outfit 10', 'Outfit 12', 'Outfit 21', 'Outfit 26', 'Outfit 33', 'Outfit 43']
    }

    // 手动策划的女装推荐 - 英文版（与中文版对应相同的outfit）
    const womenManualMapEn: Record<string, string[]> = {
      'Recommend an exquisite casual style outfit for weekend brunch with friends': ['Outfit 22', 'Outfit 27', 'Outfit 43', 'Outfit 45'],
      'Help me find an elegant and fashionable outfit for a romantic date night': ['Outfit 8', 'Outfit 12', 'Outfit 33', 'Outfit 40'],
      'I need a classic and elegant outfit for a formal business dinner': ['Outfit 1', 'Outfit 4', 'Outfit 9'],
      'I need a casual style outfit with a white t-shirt for traveling': ['Outfit 20', 'Outfit 24', 'Outfit 28', 'Outfit 34', 'Outfit 38'],
      'I have a party next week, please recommend a gorgeous half-skirt outfit': ['Outfit 13', 'Outfit 14', 'Outfit 40'],
      'Please recommend an elegant and fashionable outfit for daily office wear': ['Outfit 3', 'Outfit 10', 'Outfit 12', 'Outfit 21', 'Outfit 26', 'Outfit 33', 'Outfit 43']
    }

    // 手动策划的男装推荐 - 中文版
    const menManualMapZh: Record<string, string[]> = {
      '我要参加商务晚宴，帮我找一套商务正装风格的穿搭': ['Outfit 2', 'Outfit 7', 'Outfit 8', 'Outfit 43', 'Outfit 44'],
      '帮我推荐一些商务休闲风格的穿搭,适合日常办公室': ['Outfit 4', 'Outfit 5'],
      '帮我推荐一些浅色系日常休闲风的穿搭，适合周末和朋友去早午餐': ['Outfit 1', 'Outfit 12', 'Outfit 23', 'Outfit 24', 'Outfit 28', 'Outfit 34', 'Outfit 39', 'Outfit 47', 'Outfit 49'],
      '我需要一套精致休闲风格的穿搭，适合晚上去约会': ['Outfit 6', 'Outfit 20', 'Outfit 21', 'Outfit 25', 'Outfit 29', 'Outfit 30', 'Outfit 32', 'Outfit 33'],
      '我准备去旅行，想要轻松的日常休闲风，最好是圆领T恤搭配': ['Outfit 3', 'Outfit 10', 'Outfit 35', 'Outfit 39', 'Outfit 49'],
      '帮我找一套精致休闲风格的西服': ['Outfit 13', 'Outfit 25', 'Outfit 29', 'Outfit 42']
    }

    // 手动策划的男装推荐 - 英文版（与中文版对应相同的outfit）
    const menManualMapEn: Record<string, string[]> = {
      "I'm attending a business dinner, help me find a business formal outfit": ['Outfit 2', 'Outfit 7', 'Outfit 8', 'Outfit 43', 'Outfit 44'],
      'Please recommend some business casual outfits for daily office wear': ['Outfit 4', 'Outfit 5'],
      'Please recommend some light-colored casual outfits for weekend brunch with friends': ['Outfit 1', 'Outfit 12', 'Outfit 23', 'Outfit 24', 'Outfit 28', 'Outfit 34', 'Outfit 39', 'Outfit 47', 'Outfit 49'],
      'I need an exquisite casual outfit for a date night': ['Outfit 6', 'Outfit 20', 'Outfit 21', 'Outfit 25', 'Outfit 29', 'Outfit 30', 'Outfit 32', 'Outfit 33'],
      "I'm going on a trip, want a relaxed casual style, preferably with a crew neck t-shirt": ['Outfit 3', 'Outfit 10', 'Outfit 35', 'Outfit 39', 'Outfit 49'],
      'Help me find an exquisite casual style suit': ['Outfit 13', 'Outfit 25', 'Outfit 29', 'Outfit 42']
    }

    // 根据性别和语言选择正确的映射
    let manualMap: Record<string, string[]>
    if (gender === 'women') {
      manualMap = language === 'en' ? womenManualMapEn : womenManualMapZh
    } else {
      manualMap = language === 'en' ? menManualMapEn : menManualMapZh
    }

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
      if (outfitData.bags_id && outfitData.bags_id.trim()) {
        items.bags = this.createProductItem(outfitData.bags_id, 'bags')
      }

      // 使用CSV中的推荐理由，如果没有则使用默认理由
      const translatedStyle = this.translateStyle(outfit.Style || '时尚', language)
      const reason = language === 'en'
        ? (outfit.ReasonsEn || `Carefully selected classic combination for you, this ${translatedStyle} style outfit perfectly suits your scenario needs and showcases your unique personal charm and taste.`)
        : (outfit.ReasonsCh || `精心为您挑选的经典搭配，这套${translatedStyle}风格的穿搭完美适应您的场景需求，展现独特的个人魅力与品味。`)

      const rawOccasions = outfitData.occasions ? outfitData.occasions.split(',').map((o: string) => o.trim()) : []

      const recommendation: OutfitRecommendation = {
        outfit: {
          id: parseInt(outfit.id.replace('Outfit ', '')) || 0,
          name: outfit.id,
          style: translatedStyle,
          occasions: this.translateOccasions(rawOccasions, language),
          gender: gender,
          tryOnImages: {
            image1: outfit.TryOnImage1,
            image2: outfit.TryOnImage2,
            image3: outfit.TryOnImage3
          }
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
  async getExactMatchRecommendations(prompt: string, gender: 'women' | 'men' = 'women', language: 'en' | 'zh' = 'en'): Promise<OutfitRecommendation[]> {
    try {
      console.log('🔍 Starting exact match recommendation for:', prompt)

      // 确保CSV数据服务已初始化
      await csvDataService.initialize()

      // 🎯 检查是否为预定义的手动策划推荐
      const manualRecommendation = await this.checkManualRecommendation(prompt, gender, language)
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
            score += productMatches.length * 50 // 每个产品匹配50分（提高权重）
            matchDetails.productMatches = productMatches
            console.log(`✅ ${outfit.id} - Product matches:`, productMatches)
          }

          if (colorMatches.length > 0) {
            score += colorMatches.length * 40 // 每个同单品颜色匹配40分（提高权重）
            matchDetails.colorMatches = colorMatches
            console.log(`🎨 ${outfit.id} - Same-item color matches:`, colorMatches)
          }

          // 🔥 超级加分：产品+颜色完美组合（同一单品既匹配产品又匹配颜色）
          if (productMatches.length > 0 && colorMatches.length > 0) {
            const comboBonus = Math.min(productMatches.length, colorMatches.length) * 30
            score += comboBonus
            console.log(`🎯 ${outfit.id} - Perfect product+color combo bonus: +${comboBonus}`)
          }
        }

        // 匹配顺序3: 风格 (调整权重 - 当有具体产品要求时降低风格权重)
        if (targetStyles.length > 0) {
          const styleMatches = this.exactMatchStyles(outfit, targetStyles)
          if (styleMatches.length > 0) {
            // 如果用户指定了具体产品，风格权重降低；如果没有指定产品，风格权重保持较高
            const styleWeight = Object.keys(targetProducts).length > 0 ? 15 : 25
            score += styleMatches.length * styleWeight
            matchDetails.styleMatches = styleMatches
            console.log(`💫 ${outfit.id} - Style matches (weight: ${styleWeight}):`, styleMatches)
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

        // 使用CSV中的推荐理由，如果没有则构建基础推荐理由
        let reason: string
        if (language === 'en' && outfit.ReasonsEn) {
          reason = outfit.ReasonsEn
        } else if (language === 'zh' && outfit.ReasonsCh) {
          reason = outfit.ReasonsCh
        } else {
          // 如果CSV中没有推荐理由，则使用原有的逻辑生成
          const reasonParts: string[] = []
          if (language === 'en') {
            if (matchDetails.productMatches.length > 0) {
              reasonParts.push(`Product match: ${matchDetails.productMatches.join(', ')}`)
            }
            if (matchDetails.colorMatches.length > 0) {
              reasonParts.push(`Color match: ${matchDetails.colorMatches.join(', ')}`)
            }
            if (matchDetails.styleMatches.length > 0) {
              reasonParts.push(`Style match: ${matchDetails.styleMatches.join(', ')}`)
            }
            if (matchDetails.occasionMatches.length > 0) {
              reasonParts.push(`Occasion match: ${matchDetails.occasionMatches.join(', ')}`)
            }
          } else {
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
          }

          reason = language === 'en'
            ? (reasonParts.length > 0
              ? `This outfit perfectly matches your needs: ${reasonParts.join('; ')}. Each carefully selected item precisely matches your requirements, showcasing a perfect overall effect.`
              : `This outfit has been carefully selected for you, showcasing elegant and fashionable charm.`)
            : (reasonParts.length > 0
              ? `这套搭配完美符合您的需求：${reasonParts.join('；')}。精心挑选的每一件单品都与您的要求精确匹配，展现完美的整体效果。`
              : `这套搭配为您精心挑选，展现优雅时尚的魅力。`)
        }

        const rawOccasions = outfitData.occasions ? outfitData.occasions.split(',').map((o: string) => o.trim()) : []

        recommendations.push({
          outfit: {
            id: outfitData.id,
            name: outfitData.outfit_name,
            jacket: outfitData.jacket_id,
            upper: outfitData.upper_id,
            lower: outfitData.lower_id,
            dress: outfitData.dress_id,
            shoes: outfitData.shoes_id,
            style: this.translateStyle(outfitData.style, language),
            occasions: this.translateOccasions(rawOccasions, language),
            gender: gender,
            tryOnImages: {
              image1: outfit.TryOnImage1,
              image2: outfit.TryOnImage2,
              image3: outfit.TryOnImage3
            }
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
  async getFabBasedReason(scenario: string, outfitId: string, gender: 'women' | 'men' = 'women', language: 'en' | 'zh' = 'en'): Promise<string> {
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
      const fabReason = await this.buildFabReason(scenario, outfit, items, language)

      if (fabReason) {
        console.log(`✅ Generated FAB-based reason for ${outfitId}`)
        return fabReason
      } else {
        console.log(`⚠️ No valid FAB data found for ${outfitId}, using fallback reason`)
        const fallbackMsg = language === 'en'
          ? `This outfit has been carefully selected for you. Each piece has been thoughtfully considered, and the overall combination showcases elegant and fashionable charm, suitable for various occasions.`
          : `这套搭配为您精心挑选，每一件单品都经过细致考量，整体搭配展现优雅时尚的魅力，适合多种场合穿着。`
        return fallbackMsg
      }

    } catch (error) {
      console.error(`Error generating FAB reason for ${outfitId}:`, error)
      const errorMsg = language === 'en'
        ? 'Unable to generate FAB-based recommendation reason'
        : '无法生成基于FAB数据的推荐理由'
      throw new Error(errorMsg)
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
      expectedOutfits: ["Outfit 1", "Outfit 12", "Outfit 23", "Outfit 24", "Outfit 28", "Outfit 34", "Outfit 39", "Outfit 47", "Outfit 49"]
    },
    {
      prompt: "我需要一套精致休闲风格的穿搭，适合晚上去约会",
      expectedOutfits: ["Outfit 6", "Outfit 20", "Outfit 21", "Outfit 25", "Outfit 29", "Outfit 30", "Outfit 32", "Outfit 33"]
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