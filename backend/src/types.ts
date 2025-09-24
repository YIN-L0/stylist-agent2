// 服装单品接口
export interface OutfitItem {
  id: string;
  type: 'jacket' | 'upper' | 'lower' | 'dress' | 'shoes';
  productId: string;
}

// 完整服装搭配接口
export interface Outfit {
  id: number;
  name: string;
  jacket?: string;
  upper?: string;
  lower?: string;
  dress?: string;
  shoes?: string;
  style: string;
  occasions: string[];
}

// 推荐请求接口
export interface RecommendationRequest {
  scenario: string;
  skipVirtualTryOn?: boolean; // 可选：跳过虚拟试穿以加快响应
}

// 推荐响应接口
export interface RecommendationResponse {
  recommendations: OutfitRecommendation[];
  analysis: string;
}

// 单个推荐结果接口
export interface OutfitRecommendation {
  outfit: Outfit;
  reason: string;
  items: {
    jacket?: ProductItem;
    upper?: ProductItem;
    lower?: ProductItem;
    dress?: ProductItem;
    shoes?: ProductItem;
  };
  virtualTryOn?: VirtualTryOnResult;
}

// 产品详情接口
export interface ProductItem {
  productId: string;
  type: string;
  imageUrl: string;
  productUrl: string;
  fab?: string;
}

// 虚拟试穿结果接口
export interface VirtualTryOnResult {
  imageUrl: string;
  status: 'loading' | 'completed' | 'failed';
  error?: string;
}

// API响应通用接口
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 场景分析结果接口
export interface ScenarioAnalysis {
  occasions: string[];
  styles: string[];
  formality: 'casual' | 'smart-casual' | 'formal' | 'glam';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}

// 数据库原始记录接口
export interface OutfitRecord {
  id: number;
  outfit_name: string;
  jacket?: string;
  upper?: string;
  lower?: string;
  dress?: string;
  shoes?: string;
  style: string;
  occasions: string;
  upper_fab?: string;
  lower_fab?: string;
  dress_fab?: string;
}

