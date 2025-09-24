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
你是一名高端品牌造型顾问，请基于以下信息生成中文“概括型”推荐理由，字数控制在350字以内：

【用户场景】${scenario}
【场合】${(analysis.occasions || []).join('、') || '日常'}；【正式度】${analysis.formality || '休闲'}
【风格】${outfit.style}
【单品要点】将上衣、下装、连衣裙/外套等要点（若存在）合并为一段自然流畅的“总结”，不要出现“FAB”字样，不要分小标题。

写作要求：
1) 专业、克制、概括性强；重点强调整体风格与场合适配；
2) 略过过细的工艺/术语细节；避免内部命名与冗余细节；
3) 统一中文表达，只输出“一段话”，不分段/不列表；
4) 严禁出现“匹配度/评分/分数/百分比/Outfit/编号”等词汇或类似表述（如 85%）；
5) 超出长度时自动收敛至 350 字以内。
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是高端品牌的时尚顾问，输出专业、精炼、概括型、中文的一段式推荐理由，绝不超过350字；严禁出现‘匹配度/评分/分数/百分比/Outfit/编号’等内容。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      let text = completion.choices[0].message.content || ''
      if (text.length > 350) text = text.slice(0, 347) + '...'
      return text || '这套搭配经过精心挑选，非常适合您的场景需求';
    } catch (error) {
      console.error('Error generating recommendation reason:', error);
      throw error; // 抛出错误，让推荐服务使用fallback逻辑
    }
  }
}

export const openaiService = new OpenAIService()

