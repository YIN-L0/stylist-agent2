const { exactMatchRecommendationService } = require('./dist/services/exactMatchRecommendationService.js');

async function testProductColorMatching() {
  console.log('🧪 测试产品+颜色匹配功能...\n');

  const testCases = [
    {
      prompt: '白色裙子',
      description: '测试白色连衣裙匹配 (应该找到Outfit 7)'
    },
    {
      prompt: '白色上衣',
      description: '测试白色上衣匹配 (应该找到Outfit 2, 9, 10)'
    }
  ];

  try {
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${i + 1}. ${testCase.description}`);
      console.log(`   Prompt: "${testCase.prompt}"`);
      console.log('=' .repeat(80));

      const recommendations = await exactMatchRecommendationService.getExactMatchRecommendations(testCase.prompt, 'women');

      if (recommendations && recommendations.length > 0) {
        console.log(`✅ 返回了 ${recommendations.length} 个推荐:`);
        recommendations.slice(0, 5).forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec.outfit.name} (${rec.outfit.style})`);
        });
        if (recommendations.length > 5) {
          console.log(`   ... 还有 ${recommendations.length - 5} 个推荐`);
        }
      } else {
        console.log('❌ 没有返回推荐');
      }
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testProductColorMatching().then(() => {
  console.log('\n🏁 产品+颜色匹配测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 测试过程出错:', error);
  process.exit(1);
});