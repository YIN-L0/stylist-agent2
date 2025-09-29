const { csvDataService } = require('./dist/services/csvDataService.js');

async function debugFabData() {
  console.log('🔍 调试FAB数据读取...\n');

  try {
    await csvDataService.initialize();

    // 检查前10个outfit的FAB数据
    const dataMap = csvDataService.womenOutfitDetails;
    const outfits = Array.from(dataMap.values()).slice(0, 10);

    console.log('📊 前10个Outfit的FAB数据:');
    console.log('=' .repeat(80));

    outfits.forEach((outfit, index) => {
      console.log(`\n${index + 1}. ${outfit.id}:`);
      console.log(`   DressFAB: "${outfit.DressFAB || 'undefined'}"`);
      console.log(`   UpperFAB: "${outfit.UpperFAB || 'undefined'}"`);
      console.log(`   LowerFAB: "${outfit.LowerFAB || 'undefined'}"`);
      console.log(`   JacketFAB: "${outfit.JacketFAB || 'undefined'}"`);
      console.log(`   ShoesFAB: "${outfit.ShoesFAB || 'undefined'}"`);

      // 检查有多少非空FAB
      const fabCount = [outfit.DressFAB, outfit.UpperFAB, outfit.LowerFAB, outfit.JacketFAB, outfit.ShoesFAB]
        .filter(fab => fab && fab.trim() && fab !== 'undefined').length;
      console.log(`   非空FAB数量: ${fabCount}`);
    });

    // 查找有FAB数据的outfit
    console.log('\n🎯 有FAB数据的outfit:');
    console.log('=' .repeat(80));

    const outfitsWithFab = outfits.filter(outfit => {
      const hasFab = [outfit.DressFAB, outfit.UpperFAB, outfit.LowerFAB, outfit.JacketFAB, outfit.ShoesFAB]
        .some(fab => fab && fab.trim() && fab !== 'undefined' && fab !== '鞋履');
      return hasFab;
    });

    console.log(`找到 ${outfitsWithFab.length} 个有真实FAB数据的outfit:`);

    outfitsWithFab.forEach((outfit, index) => {
      console.log(`\n${index + 1}. ${outfit.id}:`);
      if (outfit.DressFAB && outfit.DressFAB.trim() && outfit.DressFAB !== '鞋履') {
        console.log(`   DressFAB: "${outfit.DressFAB.substring(0, 100)}..."`);
      }
      if (outfit.UpperFAB && outfit.UpperFAB.trim() && outfit.UpperFAB !== '鞋履') {
        console.log(`   UpperFAB: "${outfit.UpperFAB.substring(0, 100)}..."`);
      }
      if (outfit.LowerFAB && outfit.LowerFAB.trim() && outfit.LowerFAB !== '鞋履') {
        console.log(`   LowerFAB: "${outfit.LowerFAB.substring(0, 100)}..."`);
      }
    });

  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

debugFabData().then(() => {
  console.log('\n🏁 FAB数据调试完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 调试过程出错:', error);
  process.exit(1);
});