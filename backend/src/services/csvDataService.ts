import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse'

export interface OutfitDetailData {
  id: string

  // Product IDs
  JacketId?: string
  UpperId?: string
  LowerId?: string
  DressId?: string
  ShoesId?: string

  JacketName?: string
  JacketColor?: string
  JacketPattern?: string
  JacketType?: string
  JacketMaterial?: string
  JacketFAB?: string

  UpperName?: string
  UpperColor?: string
  UpperPattern?: string
  UpperType?: string
  UpperMaterial?: string
  UpperFAB?: string

  LowerName?: string
  LowerColor?: string
  LowerPattern?: string
  LowerType?: string
  LowerMaterial?: string
  LowerFAB?: string

  DressName?: string
  DressColor?: string
  DressPattern?: string
  DressType?: string
  DressMaterial?: string
  DressFAB?: string

  ShoesName?: string
  ShoesColor?: string
  ShoesPattern?: string
  ShoesType?: string
  ShoesMaterial?: string
  ShoesFAB?: string

  Style?: string
  Occasion?: string

  // Try-on images (generated virtual try-on images)
  TryOnImage1?: string
  TryOnImage2?: string
  TryOnImage3?: string
}

export class CSVDataService {
  private womenOutfitDetails: Map<string, OutfitDetailData> = new Map()
  private menOutfitDetails: Map<string, OutfitDetailData> = new Map()
  private initialized = false
  private initializationPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return
    
    // 防止重复初始化
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.doInitialization()
    return this.initializationPromise
  }

  private async doInitialization(): Promise<void> {
    try {
      console.log('🔄 Initializing CSV data service...')
      // 加载女装数据 - 使用绝对路径确保可靠性
      const projectRoot = path.resolve(__dirname, '../../../')
      const womenDataPath = path.join(projectRoot, 'data/women_outfits_with_all_attributes2.csv')
      console.log('Loading women data from:', womenDataPath)
      await this.loadCSVData(womenDataPath, this.womenOutfitDetails)

      // 加载男装数据
      const menDataPath = path.join(projectRoot, 'data/men_outfits_with_all_attributes2.csv')
      console.log('Loading men data from:', menDataPath)
      await this.loadMenCSVData(menDataPath, this.menOutfitDetails)

      this.initialized = true
      console.log(`📚 CSV data loaded: ${this.womenOutfitDetails.size} women outfits, ${this.menOutfitDetails.size} men outfits with TryOnImage URLs`)
    } catch (error) {
      console.error('Failed to initialize CSV data service:', error)
      this.initializationPromise = null // 重置以允许重试
      throw error
    }
  }

  private async loadCSVData(filePath: string, dataMap: Map<string, OutfitDetailData>): Promise<void> {
    return new Promise((resolve, reject) => {
      const records: any[] = []
      
      fs.createReadStream(filePath)
        .pipe(parse({ 
          columns: true, 
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          records.push(record)
        })
        .on('end', () => {
          records.forEach((record, index) => {
            const outfitId = `Outfit ${index + 1}`
            
            const detailData: OutfitDetailData = {
              id: outfitId,

              // Product IDs from CSV columns
              JacketId: record.Jacket,
              UpperId: record.Upper,
              LowerId: record.Lower,
              DressId: record.Dress,
              ShoesId: record.Shoes,

              JacketName: record.JacketName,
              JacketColor: record.JacketColor,
              JacketPattern: record.JacketPattern,
              JacketType: record.JacketType,
              JacketMaterial: record.JacketMaterial,
              JacketFAB: record.JacketFAB,

              UpperName: record.UpperName,
              UpperColor: record.UpperColor,
              UpperPattern: record.UpperPattern,
              UpperType: record.UpperType,
              UpperMaterial: record.UpperMaterial,
              UpperFAB: record.UpperFAB,

              LowerName: record.LowerName,
              LowerColor: record.LowerColor,
              LowerPattern: record.LowerPattern,
              LowerType: record.LowerType,
              LowerMaterial: record.LowerMaterial,
              LowerFAB: record.LowerFAB,

              DressName: record.DressName,
              DressColor: record.DressColor,
              DressPattern: record.DressPattern,
              DressType: record.DressType,
              DressMaterial: record.DressMaterial,
              DressFAB: record.DressFAB,

              ShoesName: record.ShoesName,
              ShoesColor: record.ShoesColor,
              ShoesPattern: record.ShoesPattern,
              ShoesType: record.ShoesType,
              ShoesMaterial: record.ShoesMaterial,
              ShoesFAB: record.ShoesFAB,

              Style: record.Style,
              Occasion: record.Occasion,

              // Try-on images - 从CSV读取TryOnImage1, TryOnImage2, TryOnImage3列
              TryOnImage1: record.TryOnImage1 || '',
              TryOnImage2: record.TryOnImage2 || '',
              TryOnImage3: record.TryOnImage3 || ''
            }
            
            dataMap.set(outfitId, detailData)
          })
          
          resolve()
        })
        .on('error', reject)
    })
  }

  private async loadMenCSVData(filePath: string, dataMap: Map<string, OutfitDetailData>): Promise<void> {
    return new Promise((resolve, reject) => {
      const records: any[] = []

      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (record) => {
          records.push(record)
        })
        .on('end', () => {
          records.forEach((record, index) => {
            const outfitId = `Outfit ${index + 1}`

            const detailData: OutfitDetailData = {
              id: outfitId,

              // Product IDs from CSV columns
              JacketId: record.Jacket,
              UpperId: record.Upper,
              LowerId: record.Lower,
              DressId: record.Dress,
              ShoesId: record.Shoes,

              JacketName: record.JacketName,
              JacketColor: record.JacketColor,
              JacketPattern: record.JacketPattern,
              JacketType: record.JacketType,
              JacketMaterial: record.JacketMaterial,
              JacketFAB: record.JacketFAB,

              UpperName: record.UpperName,
              UpperColor: record.UpperColor,
              UpperPattern: record.UpperPattern,
              UpperType: record.UpperType,
              UpperMaterial: record.UpperMaterial,
              UpperFAB: record.UpperFAB,

              LowerName: record.LowerName,
              LowerColor: record.LowerColor,
              LowerPattern: record.LowerPattern,
              LowerType: record.LowerType,
              LowerMaterial: record.LowerMaterial,
              LowerFAB: record.LowerFAB,

              DressName: record.DressName,
              DressColor: record.DressColor,
              DressPattern: record.DressPattern,
              DressType: record.DressType,
              DressMaterial: record.DressMaterial,
              DressFAB: record.DressFAB,

              ShoesName: record.ShoesName,
              ShoesColor: record.ShoesColor,
              ShoesPattern: record.ShoesPattern,
              ShoesType: record.ShoesType,
              ShoesMaterial: record.ShoesMaterial,
              ShoesFAB: record.ShoesFAB,

              Style: record.Style,
              Occasion: record.Occasion,

              // Try-on images - 男装只有一列TryOnImage，我们把它映射到三个字段
              TryOnImage1: record.TryOnImage || '',
              TryOnImage2: record.TryOnImage || '', // 同一张图片
              TryOnImage3: record.TryOnImage || ''  // 同一张图片
            }

            dataMap.set(outfitId, detailData)
          })

          resolve()
        })
        .on('error', reject)
    })
  }

  getOutfitDetails(outfitName: string, gender: 'women' | 'men' = 'women'): OutfitDetailData | undefined {
    const dataMap = gender === 'women' ? this.womenOutfitDetails : this.menOutfitDetails
    return dataMap.get(outfitName)
  }

  // 基于搭配内容进行智能搜索（不包含FAB信息以提升性能）
  async searchByContent(
    scenario: string, 
    keywords: string[], 
    gender: 'women' | 'men' = 'women', 
    limit: number = 20,
    colorPreferences?: {
      preferred?: string[]
      excluded?: string[]
      category?: string
    }
  ): Promise<OutfitDetailData[]> {
    const dataMap = gender === 'women' ? this.womenOutfitDetails : this.menOutfitDetails
    const results: { outfit: OutfitDetailData, score: number }[] = []
    
    for (const [outfitName, outfit] of dataMap) {
      let score = 0
      
      // 颜色筛选：如果有颜色要求，先进行颜色匹配
      if (colorPreferences) {
        const outfitColors = [
          outfit.JacketColor,
          outfit.UpperColor,
          outfit.LowerColor,
          outfit.DressColor,
          outfit.ShoesColor
        ].filter(Boolean).map(color => color?.toLowerCase() || '')
        
        // 颜色排除逻辑：只在完全冲突时排除，而不是混合颜色时排除
        if (colorPreferences.excluded && colorPreferences.excluded.length > 0) {
          // 检查是否所有颜色都是被排除的颜色（更宽松的筛选）
          const allColorsExcluded = outfitColors.length > 0 && outfitColors.every(outfitColor => 
            colorPreferences.excluded!.some(excludedColor => 
              outfitColor.includes(excludedColor.toLowerCase()) ||
              excludedColor.toLowerCase().includes(outfitColor)
            )
          )
          
          // 只有当所有颜色都被排除时才跳过，如果有混合颜色则保留
          if (allColorsExcluded) {
            console.log(`🚫 Outfit ${outfitName} excluded due to all colors excluded: ${outfitColors.join(', ')}`)
            continue
          }
        }
        
        // 如果有偏好颜色，给匹配的搭配加分
        if (colorPreferences.preferred && colorPreferences.preferred.length > 0) {
          const colorMatches = colorPreferences.preferred.filter(preferredColor =>
            outfitColors.some(outfitColor => 
              outfitColor.includes(preferredColor.toLowerCase()) ||
              preferredColor.toLowerCase().includes(outfitColor)
            )
          )
          if (colorMatches.length > 0) {
            score += colorMatches.length * 15 // 每个匹配的颜色加15分
            console.log(`✅ Outfit ${outfitName} color bonus (+${colorMatches.length * 15}): ${colorMatches.join(', ')}`)
          }
        }
      }
      
      // 1. 优先匹配衣服特点（Color, Name, Material, Pattern, Type）- 排除FAB信息
      const clothingFeatures = [
        outfit.JacketName, outfit.JacketColor, outfit.JacketMaterial, outfit.JacketPattern, outfit.JacketType,
        outfit.UpperName, outfit.UpperColor, outfit.UpperMaterial, outfit.UpperPattern, outfit.UpperType,
        outfit.LowerName, outfit.LowerColor, outfit.LowerMaterial, outfit.LowerPattern, outfit.LowerType,
        outfit.DressName, outfit.DressColor, outfit.DressMaterial, outfit.DressPattern, outfit.DressType,
        outfit.ShoesName, outfit.ShoesColor, outfit.ShoesMaterial, outfit.ShoesPattern, outfit.ShoesType
      ].filter(Boolean).join(' ').toLowerCase()
      
      const scenarioLower = scenario.toLowerCase()
      const scenarioWords = scenarioLower.split(/[,，\s]+/).filter(word => word.length > 1)
      
      // 2. 最高权重：专门匹配服装类型和名称 - 使用类型安全的方式
      const getMatchedItemName = (word: string): string | undefined => {
        const wordLower = word.toLowerCase()
        
        // 连衣裙相关
        if (['连衣裙', 'dress', '裙子'].includes(wordLower)) {
          return outfit.DressName
        }
        
        // 上衣相关
        if (['上衣', 'top', '衬衫', '毛衫', 't恤'].includes(wordLower)) {
          return outfit.UpperName
        }
        
        // 下装相关
        if (['下装', '裤子', '牛仔裤', '休闲裤'].includes(wordLower)) {
          return outfit.LowerName
        }
        
        // 外套相关
        if (['外套', '夹克', 'jacket'].includes(wordLower)) {
          return outfit.JacketName
        }
        
        // 鞋子相关
        if (['鞋子', '休闲鞋', '高跟鞋'].includes(wordLower)) {
          return outfit.ShoesName
        }
        
        return undefined
      }

      // 检查专门的服装类型匹配
      scenarioWords.forEach(word => {
        const matchedItemName = getMatchedItemName(word)
        if (matchedItemName) {
          score += 35 // 服装类型匹配最高分
          console.log(`🎯 Outfit ${outfitName} type match (+35): ${word} -> ${matchedItemName}`)
        }
      })

      keywords.forEach(keyword => {
        const matchedItemName = getMatchedItemName(keyword)
        if (matchedItemName) {
          score += 30 // 关键词服装类型匹配
          console.log(`🎯 Outfit ${outfitName} keyword type match (+30): ${keyword} -> ${matchedItemName}`)
        }
      })
      
      // 3. 高权重：直接匹配用户描述的衣服特点（颜色、名称、材质、图案、类型）
      scenarioWords.forEach(word => {
        if (clothingFeatures.includes(word)) {
          score += 25 // 衣服特点匹配高分
        }
      })
      
      // 4. 中权重：关键词匹配衣服特点
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase()
        if (clothingFeatures.includes(keywordLower)) {
          score += 15 // 关键词匹配衣服特点
        }
      })
      
      // 4. 低权重：场合相关匹配（在衣服特点匹配后考虑）
      const occasionKeywords = ['正式', '休闲', '商务', '约会', '优雅', '时尚', '派对', '庆祝', '办公', '晚宴']
      occasionKeywords.forEach(keyword => {
        if (clothingFeatures.includes(keyword) || scenarioLower.includes(keyword)) {
          score += 8 // 场合匹配分数较低
        }
      })
      
      // 5. 最低权重：通用场景匹配
      if (clothingFeatures.includes(scenarioLower)) {
        score += 5
      }
      
      // 部分匹配
      scenarioWords.forEach(word => {
        if (word.length > 1 && clothingFeatures.includes(word)) {
          score += 3 // 部分匹配分数更低
        }
      })
      
      if (score > 0) {
        results.push({ outfit, score })
      }
    }
    
    // 按得分排序并返回
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.outfit)
  }
}

export const csvDataService = new CSVDataService()
