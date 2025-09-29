const { exactMatchRecommendationService } = require('./dist/services/exactMatchRecommendationService.js');

async function testFixedMatching() {
  console.log('🧪 测试修复后的精确匹配算法...\n');

  // 测试: 黑色连衣裙，正式场合上班穿
  console.log('📋 测试: "黑色连衣裙，正式场合上班穿"');
  console.log('=' .repeat(50));

  try {
    const results = await exactMatchRecommendationService.getExactMatchRecommendations(
      '黑色连衣裙，正式场合上班穿',
      'women'
    );

    console.log(`✅ 找到 ${results.length} 个推荐结果:`);

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.outfit.name} (${result.outfit.id})`);
      console.log(`   推荐理由: ${result.reason}`);
      console.log(`   风格: ${result.outfit.style}`);
      console.log(`   场合: ${result.outfit.occasions?.join(', ') || 'N/A'}`);

      console.log(`   产品信息:`);
      if (result.outfit.dress) {
        console.log(`     连衣裙ID: ${result.outfit.dress}`);
      }
      if (result.outfit.upper) {
        console.log(`     上衣ID: ${result.outfit.upper}`);
      }
      if (result.outfit.lower) {
        console.log(`     下装ID: ${result.outfit.lower}`);
      }
      if (result.outfit.shoes) {
        console.log(`     鞋子ID: ${result.outfit.shoes}`);
      }
      if (result.outfit.jacket) {
        console.log(`     夹克ID: ${result.outfit.jacket}`);
      }

      console.log(`   产品项目:`);
      Object.entries(result.items || {}).forEach(([type, item]) => {
        console.log(`     ${type}: ${item.productId} (${item.imageUrl})`);
      });
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testFixedMatching().then(() => {
  console.log('\n🏁 测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 测试过程出错:', error);
  process.exit(1);
});