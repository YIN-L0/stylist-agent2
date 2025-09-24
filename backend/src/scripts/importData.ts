import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse'
import { database } from '../database/database'

// CSV列名映射
interface CSVRecord {
  '': string  // 第一列（服装名称）
  'Jacket': string
  'Upper': string
  'Lower': string
  'Dress': string
  'Shoes': string
  'Style': string
  'Occasion': string
  'Gender'?: string
  'UpperFAB'?: string
  'LowerFAB'?: string
  'DressFAB'?: string
}

// 数据清洗和验证
function cleanAndValidateRecord(record: CSVRecord, index: number, forcedGender?: 'women' | 'men'): {
  isValid: boolean
  outfit?: {
    outfit_name: string
    jacket_id?: string
    upper_id?: string
    lower_id?: string
    dress_id?: string
    shoes_id?: string
    style: string
    occasions: string
    gender?: 'women' | 'men'
  }
  errors?: string[]
} {
  const errors: string[] = []
  
  // 检查必需字段
  if (!record['Style'] || record['Style'].trim() === '') {
    errors.push('Style is required')
  }
  
  if (!record['Occasion'] || record['Occasion'].trim() === '') {
    errors.push('Occasion is required')
  }
  
  // 检查是否至少有一个服装单品
  const hasAnyItem = ['Jacket', 'Upper', 'Lower', 'Dress', 'Shoes'].some(
    key => {
      const v = record[key as keyof CSVRecord]
      return typeof v === 'string' && v.trim() !== ''
    }
  )
  
  if (!hasAnyItem) {
    errors.push('At least one clothing item is required')
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors }
  }
  
  // 清洗数据
  const cleanValue = (value: string) => {
    if (!value || value.trim() === '') return undefined
    return value.trim()
  }
  
  const outfit = {
    outfit_name: cleanValue(record['']) || `Outfit ${index}`,
    jacket_id: cleanValue(record['Jacket']),
    upper_id: cleanValue(record['Upper']),
    lower_id: cleanValue(record['Lower']),
    dress_id: cleanValue(record['Dress']),
    shoes_id: cleanValue(record['Shoes']),
    style: record['Style'].trim(),
    occasions: record['Occasion'].trim(),
    gender: (forcedGender || (record['Gender']?.trim().toLowerCase() === 'men' ? 'men' : 'women')) as 'women' | 'men',
    upper_fab: cleanValue(record['UpperFAB'] || ''),
    lower_fab: cleanValue(record['LowerFAB'] || ''),
    dress_fab: cleanValue(record['DressFAB'] || '')
  }
  
  return { isValid: true, outfit }
}

async function importOne(csvPath: string, forcedGender: 'women' | 'men'): Promise<{ imported: number, skipped: number, errors: string[] }> {
  const errors: string[] = []
  let imported = 0
  let skipped = 0

  const csvData = fs.readFileSync(csvPath, 'utf-8')
  await new Promise<void>((resolve, reject) => {
    parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"'
    }, async (err, records: CSVRecord[]) => {
      if (err) {
        return reject(err)
      }
      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        const result = cleanAndValidateRecord(record, i + 1, forcedGender)
        if (!result.isValid) {
          skipped++
          errors.push(`Row ${i + 1}: ${result.errors?.join(', ')}`)
          continue
        }
        try {
          await database.insertOutfit(result.outfit!)
          imported++
        } catch (e) {
          skipped++
          errors.push(`Row ${i + 1}: Database insert failed - ${e}`)
        }
      }
      resolve()
    })
  })

  return { imported, skipped, errors }
}

async function importData() {
  try {
    console.log('🔄 Importing outfit data from CSV...')

    const womenPath = path.join(__dirname, '../../../data/women_outfits_with_all_attributes.csv')
    const menPath = path.join(__dirname, '../../../data/men_outfits_withallattributes_merged.csv')

    if (!fs.existsSync(womenPath) && !fs.existsSync(menPath)) {
      throw new Error('No CSV file found')
    }

    console.log('🗑️ Clearing existing data...')
    await database.clearOutfits()

    let totalImported = 0
    let totalSkipped = 0
    const allErrors: string[] = []

    if (fs.existsSync(womenPath)) {
      console.log(`📁 Importing women: ${womenPath}`)
      const r = await importOne(womenPath, 'women')
      totalImported += r.imported
      totalSkipped += r.skipped
      allErrors.push(...r.errors)
    }

    if (fs.existsSync(menPath)) {
      console.log(`📁 Importing men: ${menPath}`)
      const r = await importOne(menPath, 'men')
      totalImported += r.imported
      totalSkipped += r.skipped
      allErrors.push(...r.errors)
    }

    console.log('\nImport Summary:')
    console.log(`Successfully imported: ${totalImported} outfits`)
    console.log(`Skipped: ${totalSkipped} records`)
    if (allErrors.length) {
      console.log('Errors (first 10):')
      allErrors.slice(0, 10).forEach(e => console.log('  -', e))
    }

    try {
      const stats = await database.getStats()
      console.log('\nDatabase Statistics:')
      console.log(`Total outfits: ${stats.total}`)
      console.log('Styles:', Object.entries(stats.styles).map(([k, v]) => `${k}(${v})`).join(', '))
      console.log('Top occasions:', Object.entries(stats.occasions)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([k, v]) => `${k}(${v})`)
        .join(', '))
    } catch (statsError) {
      console.log('Could not retrieve statistics:', statsError)
    }
  } catch (error) {
    console.error('Error importing data:', error)
    throw error
  }
}

// 只有直接运行此脚本时才执行
if (require.main === module) {
  importData().then(() => {
    console.log('Data import completed successfully!')
    database.close()
    process.exit(0)
  }).catch((error) => {
    console.error('Data import failed:', error)
    database.close()
    process.exit(1)
  })
}

export { importData }
