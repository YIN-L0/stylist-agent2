import sqlite3 from 'sqlite3'
import path from 'path'

const DATABASE_PATH = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'production' ? ':memory:' : './database.sqlite')

export class Database {
  private db: sqlite3.Database

  constructor() {
    this.db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message)
      } else {
             console.log('Connected to SQLite database')
      }
    })
  }

  // 初始化数据库表
  async initializeTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const createOutfitsTable = `
        CREATE TABLE IF NOT EXISTS outfits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          outfit_name TEXT NOT NULL,
          jacket_id TEXT,
          upper_id TEXT,
          lower_id TEXT,
          dress_id TEXT,
          shoes_id TEXT,
          style TEXT NOT NULL,
          occasions TEXT NOT NULL,
          jacket_fab TEXT,
          upper_fab TEXT,
          lower_fab TEXT,
          dress_fab TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          -- 添加索引以提升查询性能
          UNIQUE(outfit_name)
        )
      `

      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_outfits_style ON outfits(style)',
        'CREATE INDEX IF NOT EXISTS idx_outfits_occasions ON outfits(occasions)'
      ]

      this.db.run(createOutfitsTable, (err) => {
        if (err) {
          console.error('Error creating outfits table:', err.message)
          reject(err)
          return
        }
        
        console.log('✅ Outfits table initialized')
        // 确保新增列存在（兼容旧表）
        this.ensureOutfitColumns(['jacket_fab', 'upper_fab', 'lower_fab', 'dress_fab']).then(() => {
          // 创建索引
          let indexCount = 0
          const totalIndexes = createIndexes.length
          
          if (totalIndexes === 0) {
            resolve()
            return
          }
          
          createIndexes.forEach((indexSql) => {
            this.db.run(indexSql, (indexErr) => {
              if (indexErr) {
                console.error('Error creating index:', indexErr.message)
              } else {
                console.log('✅ Index created successfully')
              }
              
              indexCount++
              if (indexCount === totalIndexes) {
                resolve()
              }
            })
          })
        }).catch(reject)
      })
    })
  }

  private async ensureOutfitColumns(columns: string[]): Promise<void> {
    const existingColumns = await new Promise<string[]>((resolve, reject) => {
      this.db.all("PRAGMA table_info(outfits)", (err, rows: any[]) => {
        if (err) return reject(err)
        resolve(rows.map(r => r.name as string))
      })
    })

    await Promise.all(columns.map(col => {
      if (existingColumns.includes(col)) return Promise.resolve()
      return new Promise<void>((resolve, reject) => {
        this.db.run(`ALTER TABLE outfits ADD COLUMN ${col} TEXT`, (err) => {
          if (err) {
            // 若失败，输出日志但不阻断
            console.warn(`Could not add column ${col}:`, err.message)
          } else {
            console.log(`✅ Added missing column: ${col}`)
          }
          resolve()
        })
      })
    }))
  }

  // 插入服装数据
  async insertOutfit(outfit: {
    outfit_name: string
    jacket_id?: string
    upper_id?: string
    lower_id?: string
    dress_id?: string
    shoes_id?: string
    style: string
    occasions: string
    jacket_fab?: string
    upper_fab?: string
    lower_fab?: string
    dress_fab?: string
  }): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO outfits 
        (outfit_name, jacket_id, upper_id, lower_id, dress_id, shoes_id, style, occasions, jacket_fab, upper_fab, lower_fab, dress_fab)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      
      const params = [
        outfit.outfit_name,
        outfit.jacket_id || null,
        outfit.upper_id || null,
        outfit.lower_id || null,
        outfit.dress_id || null,
        outfit.shoes_id || null,
        outfit.style,
        outfit.occasions,
        outfit.jacket_fab || null,
        outfit.upper_fab || null,
        outfit.lower_fab || null,
        outfit.dress_fab || null
      ]

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err)
        } else {
          resolve(this.lastID)
        }
      })
    })
  }

  // 根据场合和风格搜索服装
  async searchOutfits(occasions: string[], styles: string[], limit: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM outfits WHERE 1=1'
      const params: any[] = []

      if (occasions.length > 0) {
        const occasionConditions = occasions.map(() => 'occasions LIKE ?').join(' OR ')
        sql += ` AND (${occasionConditions})`
        occasions.forEach(occasion => params.push(`%${occasion}%`))
      }

      if (styles.length > 0) {
        const styleConditions = styles.map(() => 'style LIKE ?').join(' OR ')
        sql += ` AND (${styleConditions})`
        styles.forEach(style => params.push(`%${style}%`))
      }

      sql += ` ORDER BY id LIMIT ?`
      params.push(limit)

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // 获取所有服装
  async getAllOutfits(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM outfits ORDER BY id', (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // 根据ID获取服装
  async getOutfitById(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM outfits WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  // 清空数据表（用于重新导入数据）
  async clearOutfits(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM outfits', (err) => {
        if (err) {
          reject(err)
        } else {
          console.log('🗑️ Outfits table cleared')
          resolve()
        }
      })
    })
  }

  // 获取数据统计信息
  async getStats(): Promise<{
    total: number
    styles: { [key: string]: number }
    occasions: { [key: string]: number }
  }> {
    return new Promise((resolve, reject) => {
      // 获取总数
      this.db.get('SELECT COUNT(*) as total FROM outfits', (err, totalRow: any) => {
        if (err) {
          reject(err)
          return
        }

        // 获取风格统计
        this.db.all('SELECT style, COUNT(*) as count FROM outfits GROUP BY style', (err, styleRows: any[]) => {
          if (err) {
            reject(err)
            return
          }

          const styles: { [key: string]: number } = {}
          styleRows.forEach(row => {
            styles[row.style] = row.count
          })

          // 获取场合统计（这里简化处理，实际场合可能包含多个值）
          this.db.all('SELECT occasions FROM outfits', (err, occasionRows: any[]) => {
            if (err) {
              reject(err)
              return
            }

            const occasions: { [key: string]: number } = {}
            occasionRows.forEach(row => {
              const occasionList = row.occasions.split(',').map((o: string) => o.trim())
              occasionList.forEach((occasion: string) => {
                occasions[occasion] = (occasions[occasion] || 0) + 1
              })
            })

            resolve({
              total: totalRow.total,
              styles,
              occasions
            })
          })
        })
      })
    })
  }

  // 模糊搜索服装（支持名称、风格、场合的模糊搜索）
  async fuzzySearch(query: string, limit: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM outfits 
        WHERE outfit_name LIKE ? 
           OR style LIKE ? 
           OR occasions LIKE ?
        ORDER BY 
          CASE 
            WHEN outfit_name LIKE ? THEN 1
            WHEN style LIKE ? THEN 2
            WHEN occasions LIKE ? THEN 3
            ELSE 4
          END
        LIMIT ?
      `
      
      const searchPattern = `%${query}%`
      const params = [
        searchPattern, searchPattern, searchPattern,  // WHERE 条件
        searchPattern, searchPattern, searchPattern,  // ORDER BY 条件  
        limit
      ]

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // 根据产品ID查找包含该产品的所有服装
  async findOutfitsByProductId(productId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM outfits 
        WHERE jacket_id = ? 
           OR upper_id = ? 
           OR lower_id = ? 
           OR dress_id = ? 
           OR shoes_id = ?
      `
      
      const params = Array(5).fill(productId)

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // 关闭数据库连接
  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message)
      } else {
        console.log('📊 Database connection closed')
      }
    })
  }
}

export const database = new Database()
