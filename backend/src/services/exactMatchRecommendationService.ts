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
    const fabParts: string[] = []
    if (outfit.DressFAB) fabParts.push(outfit.DressFAB)
    if (outfit.UpperFAB) fabParts.push(outfit.UpperFAB)
    if (outfit.LowerFAB) fabParts.push(outfit.LowerFAB)
    if (outfit.JacketFAB) fabParts.push(outfit.JacketFAB)
    if (outfit.ShoesFAB) fabParts.push(outfit.ShoesFAB)

    if (fabParts.length === 0) return null

    // 解析场合
    const occasions = outfit.Occasion ? outfit.Occasion.split(',').map(o => o.trim()) : ['日常']
    const occText = occasions.join('、')

    // 清理FAB内容
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

      // 构建详细信息对象
      const outfitDetails = {
        dressFAB: outfit.DressFAB,
        upperFAB: outfit.UpperFAB,
        lowerFAB: outfit.LowerFAB,
        jacketFAB: outfit.JacketFAB,
        shoesFAB: outfit.ShoesFAB
      }

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

        // 构建推荐理由 - 优先使用FAB数据生成
        let reason: string

        try {
          const fabReason = await this.buildFabReason(prompt, outfit, items)
          if (fabReason) {
            reason = fabReason
          } else {
            // 回退到匹配详情推荐理由
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

            reason = reasonParts.length > 0
              ? `这套搭配完美符合您的需求：${reasonParts.join('；')}。精心挑选的每一件单品都与您的要求精确匹配，展现完美的整体效果。`
              : `这套搭配为您精心挑选，展现优雅时尚的魅力。`
          }
        } catch (error) {
          console.error('Error generating recommendation reason:', error)
          reason = `这套搭配为您精心挑选，展现优雅时尚的魅力。`
        }

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