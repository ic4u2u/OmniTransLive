export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  voiceCode: string;
  category: '동아시아' | '동남아/남아시아' | '유럽' | '중동/기타';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // 1. 동아시아 (6개)
  { code: 'ko', name: '한국어', nativeName: '한국어', flag: '🇰🇷', voiceCode: 'ko-KR', category: '동아시아' },
  { code: 'en', name: '영어', nativeName: 'English', flag: '🇺🇸', voiceCode: 'en-US', category: '동아시아' },
  { code: 'ja', name: '일본어', nativeName: '日本語', flag: '🇯🇵', voiceCode: 'ja-JP', category: '동아시아' },
  { code: 'zh-CN', name: '중국어 (간체)', nativeName: '简体中文', flag: '🇨🇳', voiceCode: 'zh-CN', category: '동아시아' },
  { code: 'zh-TW', name: '중국어 (번체)', nativeName: '繁體中文', flag: '🇹🇼', voiceCode: 'zh-TW', category: '동아시아' },
  { code: 'yue', name: '광둥어 (홍콩)', nativeName: '廣東話', flag: '🇭🇰', voiceCode: 'zh-HK', category: '동아시아' },

  // 2. 동남아 / 남아시아 (6개)
  { code: 'vi', name: '베트남어', nativeName: 'Tiếng Việt', flag: '🇻🇳', voiceCode: 'vi-VN', category: '동남아/남아시아' },
  { code: 'th', name: '태국어', nativeName: 'ไทย', flag: '🇹🇭', voiceCode: 'th-TH', category: '동남아/남아시아' },
  { code: 'id', name: '인도네시아어', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', voiceCode: 'id-ID', category: '동남아/남아시아' },
  { code: 'ms', name: '말레이어', nativeName: 'Bahasa Melayu', flag: '🇲🇾', voiceCode: 'ms-MY', category: '동남아/남아시아' },
  { code: 'tl', name: '타갈로그어 (필리핀)', nativeName: 'Tagalog / Filipino', flag: '🇵🇭', voiceCode: 'fil-PH', category: '동남아/남아시아' },
  { code: 'hi', name: '힌디어 (인도)', nativeName: 'हिन्दी', flag: '🇮🇳', voiceCode: 'hi-IN', category: '동남아/남아시아' },

  // 3. 유럽 (9개)
  { code: 'es', name: '스페인어', nativeName: 'Español', flag: '🇪🇸', voiceCode: 'es-ES', category: '유럽' },
  { code: 'fr', name: '프랑스어', nativeName: 'Français', flag: '🇫🇷', voiceCode: 'fr-FR', category: '유럽' },
  { code: 'de', name: '독일어', nativeName: 'Deutsch', flag: '🇩🇪', voiceCode: 'de-DE', category: '유럽' },
  { code: 'it', name: '이탈리아어', nativeName: 'Italiano', flag: '🇮🇹', voiceCode: 'it-IT', category: '유럽' },
  { code: 'pt', name: '포르투갈어', nativeName: 'Português', flag: '🇧🇷', voiceCode: 'pt-BR', category: '유럽' },
  { code: 'ru', name: '러시아어', nativeName: 'Русский', flag: '🇷🇺', voiceCode: 'ru-RU', category: '유럽' },
  { code: 'nl', name: '네덜란드어', nativeName: 'Nederlands', flag: '🇳🇱', voiceCode: 'nl-NL', category: '유럽' },
  { code: 'pl', name: '폴란드어', nativeName: 'Polski', flag: '🇵🇱', voiceCode: 'pl-PL', category: '유럽' },
  { code: 'sv', name: '스웨덴어', nativeName: 'Svenska', flag: '🇸🇪', voiceCode: 'sv-SE', category: '유럽' },

  // 4. 중동 / 기타 (4개)
  { code: 'ar', name: '아랍어', nativeName: 'العربية', flag: '🇸🇦', voiceCode: 'ar-SA', category: '중동/기타' },
  { code: 'tr', name: '튀르키예어 (터키)', nativeName: 'Türkçe', flag: '🇹🇷', voiceCode: 'tr-TR', category: '중동/기타' },
  { code: 'he', name: '히브리어 (이스라엘)', nativeName: 'עברית', flag: '🇮🇱', voiceCode: 'he-IL', category: '중동/기타' },
  { code: 'fa', name: '페르시아어 (이란)', nativeName: 'فارسی', flag: '🇮🇷', voiceCode: 'fa-IR', category: '중동/기타' },
];

export interface TranslationMessage {
  id: string;
  speakerId: 'A' | 'B';
  speakerName: string;
  originalText: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  timestamp: Date;
  confidence?: number;
  isStreaming?: boolean;
}

export type SessionMode = '1to1' | 'pricing';

export type PlanType = 'free' | 'lite' | 'standard' | 'premium';

export interface PricingPlan {
  id: PlanType;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  minutesPerMonth: number | 'unlimited';
  customDatasets: number;
  features: string[];
}

export interface CustomDataset {
  id: string;
  name: string;
  description: string;
  termsCount: number;
  createdAt: string;
  active: boolean;
}

export interface UserAccount {
  currentPlan: PlanType;
  remainingMinutes: number;
  usedMinutes: number;
  datasets: CustomDataset[];
  voiceEnabled: boolean;
}
