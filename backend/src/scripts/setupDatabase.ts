import { database } from '../database/database'

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...')
    
    await database.initializeTables()
    
    console.log('✅ Database setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error setting up database:', error)
    process.exit(1)
  }
}

// 只有直接运行此脚本时才执行
if (require.main === module) {
  setupDatabase()
}

