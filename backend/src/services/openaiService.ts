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
  colors?: {
    preferred?: string[]  // 用户偏好的颜色，如["白色", "粉色", "浅蓝色"]
    excluded?: string[]   // 需要排除的颜色，如["黑色", "深色"]
    category?: string     // 颜色类别，如"浅色系", "深色系", "暖色系", "冷色系"
  }
}

export class OpenAIService {
  async analyzeScenario(scenario: string): Promise<ScenarioAnalysis> {
    try {
      const prompt = `
你是一个专业的时尚顾问。请分析用户描述的场景，专注于提取中文「场合」、「正式程度」和「颜色偏好」。

用户场景：${scenario}

请分析并返回JSON格式的结果（注意 occasions 只能从下方中文列表中选择）：
{
  "occasions": ["从以下选项中选择 1-3 个：办公室, 商务晚宴, 约会夜晚, 鸡尾酒活动, 派对活动, 庆祝活动, 日常休闲, 旅行, 周末早午餐, 节日活动, 音乐会, 面试"],
  "formality": "Formal | Semi-Formal | Casual",
  "keywords": ["与场合相关的中文关键词与同义词，用于模糊匹配"],
  "context": "场景上下文描述（简短中文）",
  "confidence": 0.8,
  "colors": {
    "preferred": ["如果用户提到颜色偏好，列出具体颜色，如：白色、粉色、浅蓝色、米色等"],
    "excluded": ["需要排除的颜色，如：黑色、深色等"],
    "category": "颜色类别：浅色系、深色系、暖色系、冷色系、亮色系、中性色 等，如果用户没有颜色要求则为null"
  }
}

颜色识别规则：
1) "浅色系" = preferred: ["白色","米色","粉色","浅蓝色","浅紫色","浅黄色","浅绿色"], excluded: ["黑色","深蓝色","深棕色","深灰色"]
2) "深色系" = preferred: ["黑色","深蓝色","深棕色","深灰色"], excluded: ["白色","浅色"]
3) "暖色系" = preferred: ["红色","橙色","黄色","粉色","暖棕色"]
4) "冷色系" = preferred: ["蓝色","绿色","紫色","灰色"]
5) 具体颜色直接映射，如"白色上衣" = preferred: ["白色"]

场合规则：
1) 场合请使用上面提供的中文标签，不要输出英文标签。
2) 结合同义词联想：如"约会"联想到"男朋友/女朋友/情人节/浪漫晚餐"等。
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
        // 清理响应：移除可能的markdown代码块标记
        let cleanResponse = response.trim()
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        const result = JSON.parse(cleanResponse);
        
        // 验证必要字段
        if (!result.occasions || !Array.isArray(result.occasions)) {
          throw new Error('Invalid response format');
        }

        return {
          occasions: result.occasions,
          formality: result.formality || 'Casual',
          keywords: result.keywords || [],
          context: result.context || scenario,
          confidence: result.confidence || 0.7,
          colors: result.colors || undefined
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', response);
        // 返回默认分析结果
        return {
          occasions: ['Everyday Casual'],
          formality: 'Casual',
          keywords: ['休闲', '日常'],
          context: scenario,
          confidence: 0.5,
          colors: undefined
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to analyze scenario');
    }
  }

  async generateRecommendationReason(scenario: string, outfit: any, analysis: ScenarioAnalysis, outfitDetails?: any): Promise<string> {
    try {
      // 构建详细的搭配信息 - 使用新的FAB数据结构
      let detailsText = '';
      if (outfitDetails) {
        const details = [];

        // 添加连衣裙信息
        if (outfitDetails.dressfab) {
          details.push(`连衣裙：${outfitDetails.dressfab}`);
        }

        // 添加上装信息
        if (outfitDetails.upperfab) {
          details.push(`上装：${outfitDetails.upperfab}`);
        }

        // 添加下装信息
        if (outfitDetails.lowerfab) {
          details.push(`下装：${outfitDetails.lowerfab}`);
        }

        // 添加外套信息
        if (outfitDetails.jacketfab) {
          details.push(`外套：${outfitDetails.jacketfab}`);
        }

        // 添加鞋子信息
        if (outfitDetails.shoesfab) {
          details.push(`鞋履：${outfitDetails.shoesfab}`);
        }

        detailsText = details.join('\n\n');
      }

      const prompt = `
基于以下搭配信息，写一段推荐理由，要求严格控制在200字以内：

【用户需求】${scenario}
【搭配详情】
${detailsText || '基础搭配信息'}

写作要求：
1) 直接分析穿搭特点，重点描述FAB信息（面料、工艺、设计特点）
2) 说明整体搭配的优势和适用场合  
3) 如果搭配与用户需求略有差异，可简短说明为什么这套穿搭仍适合
4) 不要提及prompt、用户、感谢等词汇
5) 严禁出现"匹配度/评分/分数/百分比/Outfit/编号/排名"等词汇
6) 控制在200字以内，确保语句完整，不要出现话说一半的情况

只返回完整的推荐理由文字。
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "你是专业时尚顾问，擅长基于FAB信息分析穿搭特点。写作时语言精练，确保200字以内完整表达，不说半句话。"
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
      
      // 智能截断：如果超过200字，寻找最近的句号或逗号截断，保持完整性
      if (text.length > 200) {
        const truncated = text.slice(0, 200)
        const lastPeriod = truncated.lastIndexOf('。')
        const lastComma = truncated.lastIndexOf('，')
        const lastCutPoint = Math.max(lastPeriod, lastComma)
        
        if (lastCutPoint > 150) {
          // 如果在150字后找到了合适的断点，就在那里截断
          text = text.slice(0, lastCutPoint + 1)
        } else {
          // 否则在200字处强制截断，但不加省略号，让AI学会控制长度
          text = text.slice(0, 200)
        }
      }
      return text || '这套搭配经过精心甄选，版型与场合契合度出色。';
    } catch (error) {
      console.error('Error generating recommendation reason:', error);
      throw error; // 抛出错误，让推荐服务使用fallback逻辑
    }
  }
}

export const openaiService = new OpenAIService()

