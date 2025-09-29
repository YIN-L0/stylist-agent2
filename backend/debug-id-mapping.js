const { csvDataService } = require('./dist/services/csvDataService.js');
const { database } = require('./dist/database/database.js');

async function debugIdMapping() {
  console.log('🔍 调试ID映射问题...\n');

  try {
    // 初始化服务
    await csvDataService.initialize();

    // 获取CSV中的前5个outfit
    const dataMap = csvDataService.womenOutfitDetails;
    const csvOutfits = Array.from(dataMap.values()).slice(0, 5);

    console.log('📊 CSV数据中的前5个outfit:');
    console.log('=' .repeat(60));
    csvOutfits.forEach((outfit, index) => {
      console.log(`${index + 1}. CSV ID: "${outfit.id}"`);
      console.log(`   DressName: "${outfit.DressName || 'N/A'}"`);
      console.log(`   UpperName: "${outfit.UpperName || 'N/A'}"`);
      console.log(`   Style: "${outfit.Style || 'N/A'}"`);
      console.log(`   Occasion: "${outfit.Occasion || 'N/A'}"`);
      console.log('');
    });

    // 获取数据库中的前5个outfit
    console.log('🗄️  数据库中的前5个outfit:');
    console.log('=' .repeat(60));
    const dbOutfits = await database.searchOutfits([], [], 5, 'women');

    dbOutfits.forEach((outfit, index) => {
      console.log(`${index + 1}. DB ID: ${outfit.id}, Name: "${outfit.outfit_name}"`);
      console.log(`   Dress ID: "${outfit.dress_id || 'N/A'}"`);
      console.log(`   Upper ID: "${outfit.upper_id || 'N/A'}"`);
      console.log(`   Style: "${outfit.style || 'N/A'}"`);
      console.log(`   Occasions: "${outfit.occasions || 'N/A'}"`);
      console.log('');
    });

    // 检查特定的匹配
    console.log('🎯 检查精确匹配找到的outfit:');
    console.log('=' .repeat(60));

    const outfit4 = dataMap.get('Outfit 4');
    const outfit9 = dataMap.get('Outfit 9');

    console.log('CSV中的 Outfit 4:');
    console.log(`   DressName: "${outfit4?.DressName || 'N/A'}"`);
    console.log(`   Style: "${outfit4?.Style || 'N/A'}"`);
    console.log(`   Occasion: "${outfit4?.Occasion || 'N/A'}"`);

    console.log('\nCSV中的 Outfit 9:');
    console.log(`   DressName: "${outfit9?.DressName || 'N/A'}"`);
    console.log(`   Style: "${outfit9?.Style || 'N/A'}"`);
    console.log(`   Occasion: "${outfit9?.Occasion || 'N/A'}"`);

    // 尝试在数据库中查找对应的记录
    console.log('\n🔍 在数据库中查找对应记录:');
    console.log('=' .repeat(60));

    const dbOutfit4 = dbOutfits.find(outfit => outfit.outfit_name === 'Outfit 4');
    const dbOutfit9 = dbOutfits.find(outfit => outfit.outfit_name === 'Outfit 9');

    console.log('数据库中的 Outfit 4:', dbOutfit4 ? '找到' : '未找到');
    console.log('数据库中的 Outfit 9:', dbOutfit9 ? '找到' : '未找到');

    if (dbOutfit4) {
      console.log(`   DB Outfit 4 - Dress: ${dbOutfit4.dress_id}, Upper: ${dbOutfit4.upper_id}`);
    }
    if (dbOutfit9) {
      console.log(`   DB Outfit 9 - Dress: ${dbOutfit9.dress_id}, Upper: ${dbOutfit9.upper_id}`);
    }

    // 显示数据库中所有outfit的名称
    console.log('\n📋 数据库中所有outfit名称:');
    const allDbOutfits = await database.searchOutfits([], [], 50, 'women');
    console.log(allDbOutfits.map(o => o.outfit_name).slice(0, 10).join(', '), '...');

  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

debugIdMapping().then(() => {
  console.log('\n🏁 调试完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 调试过程出错:', error);
  process.exit(1);
});