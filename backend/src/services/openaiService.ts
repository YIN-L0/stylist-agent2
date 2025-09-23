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
你是一个专业的时尚顾问。请分析用户描述的场景，专注于提取场合和正式程度信息。

用户场景：${scenario}

请分析并返回JSON格式的结果：
{
  "occasions": ["场合列表，从以下选项中选择：Office, Business Dinner, Date Night, Cocktail, Party, Celebration, Everyday Casual, Travel, Weekend Brunch, Festival, Concert, Interview"],
  "formality": "正式程度（Formal/Semi-Formal/Casual）",
  "keywords": ["关键词列表，用于模糊匹配"],
  "context": "场景上下文描述",
  "confidence": 0.8
}

分析规则：
1. 专注于场合匹配，不考虑具体风格
2. 从给定的场合列表中选择最匹配的1-3个
3. 评估正式程度：Formal(正式), Semi-Formal(半正式), Casual(休闲)
4. 提取关键词用于模糊匹配
5. 提供场景上下文描述
6. confidence表示分析的准确度(0-1)

只返回JSON格式，不要其他文字。
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

请用中文生成一个详细的推荐理由（80-120字），解释为什么这套服装适合这个场景。
要求：
1. 详细分析用户场景的特点和需求
2. 解释为什么这套服装的occasion标签与用户需求匹配
3. 说明服装风格如何适应场景的正式程度
4. 强调这套搭配如何帮助用户在特定场合中展现最佳形象
5. 语言要专业、友好、有说服力

只返回推荐理由文字，不要其他内容。
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个专业的时尚顾问，需要为用户详细解释推荐理由。请用专业、友好、有说服力的语气，深入分析服装与场景的匹配度。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return completion.choices[0].message.content || '这套搭配经过精心挑选，非常适合您的场景需求';
    } catch (error) {
      console.error('Error generating recommendation reason:', error);
      throw error; // 抛出错误，让推荐服务使用fallback逻辑
    }
  }
}

export const openaiService = new OpenAIService()

