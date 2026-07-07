export const assistantModes = ["整える", "書き直す", "作成する"] as const;

export const purposeOptions = [
  "レポート",
  "ES",
  "履歴書",
  "ブログ",
  "メール",
  "SNS",
  "レビュー",
  "企画書",
  "プレゼン",
  "議事録",
  "LINE",
  "Instagram",
  "X",
  "YouTube概要欄"
] as const;

export const rewriteDirections = [
  "もっと短く",
  "もっと丁寧",
  "もっと自然",
  "もっと説得力",
  "もっと柔らかく",
  "もっと論理的",
  "もっとフォーマル",
  "もっとカジュアル"
] as const;

export const polishAdjustments = [
  "用途変更",
  "文体変更",
  "AIっぽさ除去",
  "敬語調整",
  "読みやすさ改善"
] as const;

export const writingStyles = [
  "です・ます調",
  "である調",
  "カジュアル",
  "ビジネス",
  "敬語",
  "論文調"
] as const;

export const lengthPresets = [100, 200, 400, 800, 1200, "自由入力"] as const;

export const modelOptions = [
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o-mini",
  "gpt-4o"
] as const;

export type AssistantMode = (typeof assistantModes)[number];
export type Purpose = (typeof purposeOptions)[number];
export type RewriteDirection = (typeof rewriteDirections)[number];
export type PolishAdjustment = (typeof polishAdjustments)[number];
export type WritingStyle = (typeof writingStyles)[number];
export type LengthPreset = (typeof lengthPresets)[number];
export type ModelOption = (typeof modelOptions)[number];

export type RefineRequest = {
  mode: AssistantMode;
  text: string;
  purpose: Purpose;
  writingStyle: WritingStyle;
  rewriteDirection?: RewriteDirection;
  polishAdjustments?: PolishAdjustment[];
  targetLength: number | null;
  reduceAiTone: boolean;
  model?: string;
  highQuality?: boolean;
};

export type ImprovementReport = {
  title: string;
  description: string;
};

export type RenoteScore = {
  total: number;
  naturalness: number;
  readability: number;
  logic: number;
  politeness: number;
  clarity: number;
  aiLikeness: number;
};

export type UsageStatus = {
  plan: "free" | "pro" | "guest";
  usedToday: number;
  dailyLimit: number | null;
  remaining: number | null;
};

export type RefineResponse = {
  result?: string;
  improvements?: ImprovementReport[];
  score?: RenoteScore | null;
  usage?: UsageStatus;
  error?: string;
};
