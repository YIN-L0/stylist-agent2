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
}

// 数据清洗和验证
function cleanAndValidateRecord(record: CSVRecord, index: number): {
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
    key => record[key as keyof CSVRecord] && record[key as keyof CSVRecord].trim() !== ''
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
    occasions: record['Occasion'].trim()
  }
  
  return { isValid: true, outfit }
}

async function importData() {
  try {
    console.log('🔄 Importing outfit data from CSV...')
    
    const csvPath = path.join(__dirname, '../../../data/Women Outfit Detail, Style & Occasion - Sheet1.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`)
    }

    console.log(`📁 Reading CSV file: ${csvPath}`)
    const csvData = fs.readFileSync(csvPath, 'utf-8')
    
    return new Promise<void>((resolve, reject) => {
      parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"'
      }, async (err, records: CSVRecord[]) => {
        if (err) {
          console.error('❌ CSV parsing error:', err)
          reject(err)
          return
        }

        console.log(`📄 Found ${records.length} records in CSV`)
        
        try {
          let imported = 0
          let skipped = 0
          const errors: string[] = []
          
          // 清空现有数据（可选）
          console.log('🗑️ Clearing existing data...')
          await database.clearOutfits()
          
          for (let i = 0; i < records.length; i++) {
            const record = records[i]
            const result = cleanAndValidateRecord(record, i + 1)
            
            if (!result.isValid) {
              skipped++
              errors.push(`Row ${i + 1}: ${result.errors?.join(', ')}`)
              console.log(`⚠️ Skipping row ${i + 1}: ${result.errors?.join(', ')}`)
              continue
            }
            
            try {
              await database.insertOutfit(result.outfit!)
              imported++
              
              if (imported % 5 === 0) {
                console.log(`📥 Imported ${imported} outfits...`)
              }
            } catch (insertError) {
              skipped++
              errors.push(`Row ${i + 1}: Database insert failed - ${insertError}`)
              console.error(`❌ Failed to insert row ${i + 1}:`, insertError)
            }
          }
          
          console.log('\n📊 Import Summary:')
          console.log(`✅ Successfully imported: ${imported} outfits`)
          console.log(`⚠️ Skipped: ${skipped} records`)
          
          if (errors.length > 0) {
            console.log('\n❌ Errors encountered:')
            errors.slice(0, 10).forEach(error => console.log(`  - ${error}`))
            if (errors.length > 10) {
              console.log(`  ... and ${errors.length - 10} more errors`)
            }
          }
          
          // 显示数据统计
          try {
            const stats = await database.getStats()
            console.log('\n📊 Database Statistics:')
            console.log(`Total outfits: ${stats.total}`)
            console.log('Styles:', Object.entries(stats.styles).map(([k, v]) => `${k}(${v})`).join(', '))
            console.log('Top occasions:', Object.entries(stats.occasions)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([k, v]) => `${k}(${v})`)
              .join(', '))
          } catch (statsError) {
            console.log('⚠️ Could not retrieve statistics:', statsError)
          }
          
          resolve()
        } catch (error) {
          console.error('❌ Import process failed:', error)
          reject(error)
        }
      })
    })
  } catch (error) {
    console.error('❌ Error importing data:', error)
    throw error
  }
}

// 只有直接运行此脚本时才执行
if (require.main === module) {
  importData().then(() => {
    console.log('🎉 Data import completed successfully!')
    database.close()
    process.exit(0)
  }).catch((error) => {
    console.error('❌ Data import failed:', error)
    database.close()
    process.exit(1)
  })
}

export { importData }
