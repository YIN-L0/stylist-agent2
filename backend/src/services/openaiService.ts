import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ScenarioAnalysis {
  occasions: string[]
  formality: string
  keywords: string[]
  context: string
  confidence: number
}

export class OpenAIService {
  async analyzeScenario(scenario: string): Promise<ScenarioAnalysis> {
    try {
      const prompt = `
你是一个专业的时尚顾问。请分析用户描述的场景，专注于提取中文「场合」与「正式程度」。

用户场景：${scenario}

请分析并返回JSON格式的结果（注意 occasions 只能从下方中文列表中选择）：
{
  "occasions": ["从以下选项中选择 1-3 个：办公室, 商务晚宴, 约会夜晚, 鸡尾酒活动, 派对活动, 庆祝活动, 日常休闲, 旅行, 周末早午餐, 节日活动, 音乐会, 面试"],
  "formality": "Formal | Semi-Formal | Casual",
  "keywords": ["与场合相关的中文关键词与同义词，用于模糊匹配"],
  "context": "场景上下文描述（简短中文）",
  "confidence": 0.8
}

规则：
1) 场合请使用上面提供的中文标签，不要输出英文标签。
2) 结合同义词联想：如“约会”联想到“男朋友/女朋友/情人节/浪漫晚餐”等。
3) 仅返回 JSON，不要多余文字。
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个专业的时尚顾问，擅长分析用户场景并提取场合和正式程度信息。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 300
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      try {
        const result = JSON.parse(response);
        
        // 验证必要字段
        if (!result.occasions || !Array.isArray(result.occasions)) {
          throw new Error('Invalid response format');
        }

        return {
          occasions: result.occasions,
          formality: result.formality || 'Casual',
          keywords: result.keywords || [],
          context: result.context || scenario,
          confidence: result.confidence || 0.7
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', response);
        // 返回默认分析结果
        return {
          occasions: ['Everyday Casual'],
          formality: 'Casual',
          keywords: ['休闲', '日常'],
          context: scenario,
          confidence: 0.5
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to analyze scenario');
    }
  }

  async generateRecommendationReason(scenario: string, outfit: any, analysis: ScenarioAnalysis): Promise<string> {
    try {
      const prompt = `
用户场景：${scenario}
推荐服装：风格=${outfit.style}，适用场合=${outfit.occasions}
分析结果：场合=${analysis.occasions?.join(',') || '未指定'}，正式程度=${analysis.formality || 'Casual'}

请用中文生成一个时尚杂志风格的推荐理由（最多80字），解释为什么这套服装适合这个场景。
要求：
1. 使用时尚术语和英文词汇，如effortless chic、power dressing、casual elegance等
2. 语言要简洁优雅，像时尚杂志的编辑推荐
3. 突出搭配的时尚感和场合适配性
4. 避免过于口语化的表达，保持专业时尚感
5. 不要使用网络用语或过于夸张的形容词

只返回推荐理由文字，不要其他内容。
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个时尚杂志的资深编辑，需要为用户推荐服装搭配。请用专业、优雅、简洁的语言，使用时尚术语，像时尚杂志的编辑推荐一样，说明为什么这套搭配适合这个场合。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return completion.choices[0].message.content || '这套搭配经过精心挑选，非常适合您的场景需求';
    } catch (error) {
      console.error('Error generating recommendation reason:', error);
      throw error; // 抛出错误，让推荐服务使用fallback逻辑
    }
  }

  async generateCompleteSummary(scenario: string, outfit: any, analysis: ScenarioAnalysis, fabParts: string[]): Promise<string> {
    try {
      const fabContent = fabParts.length > 0 ? fabParts.join('。') : ''
      
      const prompt = `
用户场景：${scenario}
推荐服装：风格=${outfit.style}，适用场合=${outfit.occasions}
分析结果：场合=${analysis.occasions?.join(',') || '未指定'}，正式程度=${analysis.formality || 'Casual'}
产品详情：${fabContent}

请生成一个专业的中文推荐理由，严格控制在400字以内。要求：
1. 开头说明为什么这套搭配适合用户的场景
2. 如果有产品详情，请融合这些信息（去掉"设计FAB"、"面料FAB"、"工艺FAB"等标题）
3. 语言专业但易懂，像时尚顾问的推荐
4. 突出搭配的优势和适用性
5. 字数严格控制在400字以内，不要超出

只返回推荐理由文字，不要其他内容。
      `.trim()

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个专业的时尚顾问，需要根据用户场景和产品信息生成简洁专业的推荐理由。严格控制字数在400字以内。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200 // 限制token数量确保不超过400字
      })

      const result = completion.choices[0].message.content || '这套搭配经过精心挑选，非常适合您的场景需求'
      
      // 确保不超过400字
      return result.length <= 400 ? result : result.substring(0, 397) + '...'
    } catch (error) {
      console.error('Error generating complete summary:', error)
      throw error
    }
  }
}

export const openaiService = new OpenAIService()

