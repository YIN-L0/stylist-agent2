const { csvDataService } = require('./dist/services/csvDataService.js');

async function checkCSVNames() {
  console.log('🔍 检查CSV数据中的实际产品名称和颜色...\n');

  try {
    await csvDataService.initialize();

    // 检查前10个outfit的产品名称和颜色
    const dataMap = csvDataService.womenOutfitDetails;
    const outfits = Array.from(dataMap.values()).slice(0, 10);

    console.log('📊 前10个Outfit的产品名称和颜色:');
    console.log('=' .repeat(80));

    outfits.forEach((outfit, index) => {
      console.log(`\n${index + 1}. ${outfit.id}:`);

      if (outfit.DressName) {
        console.log(`   连衣裙: "${outfit.DressName}" - 颜色: "${outfit.DressColor}"`);
      }
      if (outfit.UpperName) {
        console.log(`   上衣: "${outfit.UpperName}" - 颜色: "${outfit.UpperColor}"`);
      }
      if (outfit.LowerName) {
        console.log(`   下装: "${outfit.LowerName}" - 颜色: "${outfit.LowerColor}"`);
      }
      if (outfit.JacketName) {
        console.log(`   外套: "${outfit.JacketName}" - 颜色: "${outfit.JacketColor}"`);
      }
      if (outfit.ShoesName) {
        console.log(`   鞋子: "${outfit.ShoesName}" - 颜色: "${outfit.ShoesColor}"`);
      }
    });

    // 查找包含"白色"的item
    console.log('\n🔍 查找包含白色的item:');
    console.log('=' .repeat(80));

    let whiteItemsFound = 0;
    for (const [outfitName, outfit] of dataMap) {
      const items = [
        { type: '连衣裙', name: outfit.DressName, color: outfit.DressColor },
        { type: '上衣', name: outfit.UpperName, color: outfit.UpperColor },
        { type: '下装', name: outfit.LowerName, color: outfit.LowerColor },
        { type: '外套', name: outfit.JacketName, color: outfit.JacketColor },
        { type: '鞋子', name: outfit.ShoesName, color: outfit.ShoesColor }
      ];

      items.forEach(item => {
        if (item.color && (
          item.color.toLowerCase().includes('白') ||
          item.color.toLowerCase().includes('white') ||
          item.color.toLowerCase().includes('白色')
        )) {
          console.log(`   ${outfitName} - ${item.type}: "${item.name}" - 颜色: "${item.color}"`);
          whiteItemsFound++;
        }
      });

      if (whiteItemsFound >= 5) break; // 只显示前5个
    }

    if (whiteItemsFound === 0) {
      console.log('   未找到包含白色的item');
    }

    // 查找包含"裙"的item
    console.log('\n🔍 查找包含"裙"的item:');
    console.log('=' .repeat(80));

    let dressItemsFound = 0;
    for (const [outfitName, outfit] of dataMap) {
      if (outfit.DressName && (
        outfit.DressName.includes('裙') ||
        outfit.DressName.toLowerCase().includes('dress')
      )) {
        console.log(`   ${outfitName} - 连衣裙: "${outfit.DressName}" - 颜色: "${outfit.DressColor}"`);
        dressItemsFound++;
        if (dressItemsFound >= 5) break; // 只显示前5个
      }
    }

    if (dressItemsFound === 0) {
      console.log('   未找到包含"裙"的item');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkCSVNames().then(() => {
  console.log('\n🏁 CSV名称检查完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 检查过程出错:', error);
  process.exit(1);
});