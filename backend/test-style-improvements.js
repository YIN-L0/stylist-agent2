const { exactMatchRecommendationService } = require('./dist/services/exactMatchRecommendationService.js');

async function testStyleImprovements() {
  console.log('🧪 测试改进后的风格匹配和评分系统...\n');

  const testCases = [
    {
      prompt: '我想要日常休闲风格的穿搭，白色裙子',
      description: '测试具体产品+颜色组合'
    },
    {
      prompt: '我想要日常休闲风格的穿搭，黑色上衣',
      description: '测试具体产品+颜色组合'
    },
    {
      prompt: '精致休闲风格的穿搭',
      description: '测试改进的风格提取'
    },
    {
      prompt: '日常休闲风格穿搭',
      description: '测试改进的风格提取'
    },
    {
      prompt: '商务休闲风格穿搭',
      description: '测试改进的风格提取'
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

testStyleImprovements().then(() => {
  console.log('\n🏁 风格改进测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('💥 测试过程出错:', error);
  process.exit(1);
});