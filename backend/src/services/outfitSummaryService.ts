import fs from 'fs'
import path from 'path'

interface OutfitSummary {
  outfit: string
  description: string
}

export class OutfitSummaryService {
  private womenSummaries: Map<string, string> = new Map()
  private menSummaries: Map<string, string> = new Map()
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      console.log('🔄 Initializing outfit summary service...')

      // 读取女装CSV文件
      const womenCsvPath = path.join(process.cwd(), '..', 'data', 'women_outfit_summaries_no_colon.csv')
      console.log(`📁 Checking women CSV at: ${womenCsvPath}`)
      if (fs.existsSync(womenCsvPath)) {
        const womenCsvContent = fs.readFileSync(womenCsvPath, 'utf-8')
        this.parseCSV(womenCsvContent, this.womenSummaries)
        console.log(`✅ Loaded ${this.womenSummaries.size} women outfit summaries`)
        console.log(`🔍 Sample women data:`, Array.from(this.womenSummaries.entries()).slice(0, 3))
      } else {
        console.log(`❌ Women CSV file not found at: ${womenCsvPath}`)
      }

      // 读取男装CSV文件
      const menCsvPath = path.join(process.cwd(), '..', 'data', 'men_outfit_summaries_no_colon.csv')
      console.log(`📁 Checking men CSV at: ${menCsvPath}`)
      if (fs.existsSync(menCsvPath)) {
        const menCsvContent = fs.readFileSync(menCsvPath, 'utf-8')
        this.parseCSV(menCsvContent, this.menSummaries)
        console.log(`✅ Loaded ${this.menSummaries.size} men outfit summaries`)
        console.log(`🔍 Sample men data:`, Array.from(this.menSummaries.entries()).slice(0, 3))
      } else {
        console.log(`❌ Men CSV file not found at: ${menCsvPath}`)
      }

      this.initialized = true
      console.log(`✅ Outfit summary service initialized successfully`)
    } catch (error) {
      console.error('❌ Error loading outfit summaries:', error)
    }
  }

  private parseCSV(csvContent: string, summariesMap: Map<string, string>) {
    const lines = csvContent.split('\n')

    // 跳过标题行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // 解析CSV行，处理可能包含逗号的描述
      const commaIndex = line.indexOf(',')
      if (commaIndex === -1) continue

      const outfit = line.substring(0, commaIndex).trim()
      const description = line.substring(commaIndex + 1).trim()

      // 提取outfit编号 (例如: "Outfit 1" -> "1")
      const match = outfit.match(/Outfit\s+(\d+)/)
      if (match) {
        const outfitId = match[1]
        summariesMap.set(outfitId, description)
      }
    }
  }

  /**
   * 根据outfit ID和性别获取搭配介绍词
   */
  getOutfitSummary(outfitId: string | number, gender: 'women' | 'men'): string | null {
    console.log(`🔍 Getting outfit summary for ID: ${outfitId}, gender: ${gender}`)

    if (!this.initialized) {
      console.warn('⚠️ OutfitSummaryService not initialized')
      return null
    }

    const id = String(outfitId)
    const summariesMap = gender === 'women' ? this.womenSummaries : this.menSummaries

    console.log(`📊 Searching in ${gender} summaries (${summariesMap.size} entries) for ID: ${id}`)
    const result = summariesMap.get(id)

    if (result) {
      console.log(`✅ Found CSV summary for ${gender} outfit ${id}: ${result.substring(0, 100)}...`)
    } else {
      console.log(`❌ No CSV summary found for ${gender} outfit ${id}`)
      console.log(`📋 Available IDs: ${Array.from(summariesMap.keys()).slice(0, 10).join(', ')}`)
    }

    return result || null
  }

  /**
   * 获取默认推荐理由（如果没有找到CSV中的描述）
   */
  getDefaultReason(outfitStyle?: string): string {
    return `这套${outfitStyle || '时尚'}风格的搭配经过精心甄选，完美适应您的场景需求，展现独特的个人魅力与品味。`
  }

  /**
   * 获取所有已加载的outfit数量（用于调试）
   */
  getStats() {
    return {
      initialized: this.initialized,
      womenCount: this.womenSummaries.size,
      menCount: this.menSummaries.size
    }
  }
}

// 导出单例实例
export const outfitSummaryService = new OutfitSummaryService()