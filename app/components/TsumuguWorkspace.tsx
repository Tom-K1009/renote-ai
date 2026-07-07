"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { OptionGroup } from "./OptionGroup";
import {
  assistantModes,
  lengthPresets,
  modelOptions,
  polishAdjustments,
  purposeOptions,
  rewriteDirections,
  writingStyles,
  type AssistantMode,
  type ImprovementReport,
  type LengthPreset,
  type ModelOption,
  type PolishAdjustment,
  type Purpose,
  type RefineResponse,
  type TsumuguScore,
  type RewriteDirection,
  type UsageStatus,
  type WritingStyle
} from "../lib/options";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { getPlanConfig, type BillingPlan } from "../lib/plans";

type Theme = "light" | "dark";
type Plan = "guest" | BillingPlan;

type HistoryItem = {
  id: string;
  cloudId?: string;
  mode: AssistantMode;
  source: string;
  result: string;
  purpose: Purpose;
  writingStyle: WritingStyle;
  targetLength: number | null;
  favorite: boolean;
  createdAt: string;
};

type Settings = {
  defaultPurpose: Purpose;
  defaultWritingStyle: WritingStyle;
  defaultLength: LengthPreset;
  customLength: number;
  theme: Theme;
  model: ModelOption;
};

type ErrorState = {
  title: string;
  message: string;
  action: string;
};

const defaultSettings: Settings = {
  defaultPurpose: "レポート",
  defaultWritingStyle: "です・ます調",
  defaultLength: 400,
  customLength: 400,
  theme: "light",
  model: "gpt-4.1-mini"
};

const modeCards: {
  mode: AssistantMode;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  access: "free" | "paid";
}[] = [
  {
    mode: "整える",
    icon: "📄",
    title: "整える",
    subtitle: "文章を自然にする",
    description: "今ある文章を自然に読みやすくします。意味や情報量は変えません。",
    access: "free"
  },
  {
    mode: "書き直す",
    icon: "✍️",
    title: "書き直す",
    subtitle: "伝え方を変える",
    description: "同じ内容を、もっと短く、丁寧に、自然に、柔らかく変換します。",
    access: "free"
  },
  {
    mode: "作成する",
    icon: "✨",
    title: "作成する",
    subtitle: "メモから文章を作る",
    description: "メモや箇条書きから、レポート、メール、企画書、ブログなどを作成します。",
    access: "paid"
  }
];

const scoreLabels: Array<[keyof TsumuguScore, string]> = [
  ["naturalness", "自然さ"],
  ["readability", "読みやすさ"],
  ["logic", "論理性"],
  ["politeness", "敬語"],
  ["clarity", "伝わりやすさ"],
  ["aiLikeness", "AIらしさ"]
];

const exampleTexts: Partial<Record<Purpose, string>> = {
  レポート:
    "今日は課題をやりました。\n途中で難しいと感じました。\n調べながら進めることで理解できました。\n次回はもっと早めに取り組みたいです。",
  メール:
    "明日の打ち合わせですが、資料の確認がまだ途中です。\n午前中までに見直して送ります。\n遅れてすみません。",
  企画書:
    "学生向けの文章アプリ。\nメモを入れると自然な文章にする。\n毎日使いやすい雰囲気。\nSNS投稿やレポートにも使える。",
  ブログ:
    "文章を書くのが苦手。\nAIに全部書かせるのは違う。\n自分の言葉を残したまま読みやすくしたい。",
  SNS:
    "新しい制作物を公開しました。\nまだ小さいけど、自分なりにかなりこだわりました。\n見てもらえたら嬉しいです。"
};

const historyKey = "tsumugu-history";
const settingsKey = "tsumugu-settings";
const onboardingKey = "tsumugu-onboarding-seen";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function countText(text: string) {
  return text.replace(/\s/g, "").length;
}

function splitUnits(text: string) {
  return text.match(/[^。！？\n]+[。！？]?|\n/g) ?? [text];
}

function compareText(text: string, against: string, tone: "source" | "result") {
  return splitUnits(text).map((unit, index) => {
    const trimmed = unit.trim();
    const changed = trimmed.length > 0 && !against.includes(trimmed);
    const className = changed
      ? tone === "result"
        ? "bg-sky-100 text-sky-950 dark:bg-sky-400/20 dark:text-sky-100"
        : "bg-zinc-200 text-zinc-950 dark:bg-zinc-700 dark:text-zinc-100"
      : "";

    return (
      <mark key={`${tone}-${index}`} className={`rounded px-1 ${className}`}>
        {unit}
      </mark>
    );
  });
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function restoreLengthPreset(length: number | null): LengthPreset {
  if (length && lengthPresets.includes(length as LengthPreset)) {
    return length as LengthPreset;
  }

  return length ? "自由入力" : 400;
}

function createErrorState(status: number, fallback: string): ErrorState {
  if (status === 402) {
    return {
      title: "本日の無料利用回数を使い切りました",
      message: fallback,
      action: "StudentまたはProでさらに利用できます。料金比較から選択してください。"
    };
  }

  if (status === 403) {
    return {
      title: "有料プランの機能です",
      message: fallback,
      action: "整える・書き直すは無料で利用できます。"
    };
  }

  if (status >= 500) {
    return {
      title: "サーバーで問題が発生しました",
      message: fallback,
      action: "少し時間をおいて再度お試しください。"
    };
  }

  return {
    title: "処理できませんでした",
    message: fallback,
    action: "入力内容と設定を確認してください。"
  };
}

function WelcomeModal({
  onClose,
  onSelectMode
}: {
  onClose: () => void;
  onSelectMode: (mode: AssistantMode) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/32 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6"
    >
      <section className="w-full max-w-3xl rounded-[12px] border border-white/80 bg-white p-5 shadow-[0_28px_120px_rgba(24,24,27,0.22)] dark:border-white/10 dark:bg-zinc-950 sm:p-8">
        <p className="text-sm font-medium text-sky-600 dark:text-sky-300">
          ようこそ TSUMUGUへ
        </p>
        <h2 id="welcome-title" className="mt-3 text-3xl font-semibold tracking-normal">
          今日は何をしたいですか？
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {modeCards.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => {
                onSelectMode(card.mode);
                onClose();
              }}
              className="group rounded-[10px] border border-zinc-200 bg-zinc-50 p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:bg-white hover:shadow-lg active:scale-[0.99] dark:border-zinc-800 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <span aria-hidden="true" className="text-2xl">
                {card.icon}
              </span>
              <span className="mt-4 block text-lg font-semibold">{card.title}</span>
              <span className="mt-1 block text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {card.subtitle}
              </span>
              <span className="mt-3 block text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {card.description}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-11 w-full rounded-[8px] bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-950 sm:w-auto"
        >
          はじめる
        </button>
      </section>
    </div>
  );
}

function ErrorCard({ error }: { error: ErrorState }) {
  const limitReached = error.title === "本日の無料利用回数を使い切りました";

  return (
    <div
      role="alert"
      className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100"
    >
      <p className="font-semibold">{error.title}</p>
      <p className="mt-2 leading-6">{error.message}</p>
      <p className="mt-2 text-red-700 dark:text-red-200">{error.action}</p>
      {limitReached ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/pricing" className="rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-950 transition hover:bg-red-200 dark:bg-red-400/20 dark:text-red-50">
            Student βを見る
          </Link>
          <Link href="/pricing" className="rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-950 transition hover:bg-red-200 dark:bg-red-400/20 dark:text-red-50">
            Pro βを見る
          </Link>
          <Link href="/supporter" className="rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-950 transition hover:bg-red-200 dark:bg-red-400/20 dark:text-red-50">
            Supporter βを見る
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function OutputSkeleton() {
  return (
    <div className="space-y-3" aria-label="処理中">
      <div className="shimmer h-4 w-3/4 rounded-full" />
      <div className="shimmer h-4 w-full rounded-full" />
      <div className="shimmer h-4 w-11/12 rounded-full" />
      <div className="shimmer h-4 w-2/3 rounded-full" />
    </div>
  );
}

export function TsumuguWorkspace() {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan>("guest");
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [mode, setMode] = useState<AssistantMode>("整える");
  const [text, setText] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("レポート");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("です・ます調");
  const [rewriteDirection, setRewriteDirection] =
    useState<RewriteDirection>("もっと自然");
  const [selectedAdjustments, setSelectedAdjustments] = useState<PolishAdjustment[]>([
    "AIっぽさ除去",
    "読みやすさ改善"
  ]);
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>(400);
  const [customLength, setCustomLength] = useState(400);
  const [reduceAiTone, setReduceAiTone] = useState(true);
  const [highQuality, setHighQuality] = useState(false);
  const [result, setResult] = useState("");
  const [improvements, setImprovements] = useState<ImprovementReport[]>([]);
  const [score, setScore] = useState<TsumuguScore | null>(null);
  const [consultQuestion, setConsultQuestion] = useState("この文章は失礼？");
  const [consultAnswer, setConsultAnswer] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const activePlanConfig = plan === "guest" ? null : getPlanConfig(plan);
  const isPaid = plan !== "guest" && plan !== "free";
  const canUseHighQuality = plan === "pro" || plan === "supporter";
  const canUseMode = mode !== "作成する" || Boolean(activePlanConfig?.canCreate);
  const targetLength =
    mode === "作成する"
      ? lengthPreset === "自由入力"
        ? customLength
        : lengthPreset
      : null;
  const canSubmit = text.trim().length > 0 && !isLoading && canUseMode && Boolean(user);
  const currentExample =
    exampleTexts[purpose] ??
    "今日は課題をやりました。\n途中で難しいと感じました。\n調べながら進めることで理解できました。\n次回はもっと早めに取り組みたいです。";

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) =>
      [item.mode, item.source, item.result, item.purpose, item.writingStyle]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [history, historySearch]);

  const loadCloudData = useCallback(async (currentUser: User) => {
    if (!supabase) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", currentUser.id)
      .maybeSingle();

    const nextPlan = ["student", "pro", "supporter"].includes(String(profile?.plan))
      ? (profile?.plan as BillingPlan)
      : "free";
    setPlan(nextPlan);

    const { data: cloudSettings } = await supabase
      .from("tsumugu_settings")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (cloudSettings) {
      const nextSettings: Settings = {
        defaultPurpose: cloudSettings.default_purpose as Purpose,
        defaultWritingStyle: cloudSettings.default_writing_style as WritingStyle,
        defaultLength:
          cloudSettings.default_length === "自由入力"
            ? "自由入力"
            : (Number(cloudSettings.default_length) as LengthPreset),
        customLength: cloudSettings.custom_length ?? 400,
        theme: cloudSettings.theme === "dark" ? "dark" : "light",
        model: (cloudSettings.model ?? "gpt-4.1-mini") as ModelOption
      };
      setSettings(nextSettings);
      setPurpose(nextSettings.defaultPurpose);
      setWritingStyle(nextSettings.defaultWritingStyle);
      setLengthPreset(nextSettings.defaultLength);
      setCustomLength(nextSettings.customLength);
      applyTheme(nextSettings.theme);
    }

    const { data: histories } = await supabase
      .from("tsumugu_histories")
      .select("*, tsumugu_favorites(id)")
      .order("created_at", { ascending: false })
      .limit(nextPlan === "free" ? 10 : 100);

    if (histories) {
      setHistory(
        histories.map((item) => ({
          id: item.id,
          cloudId: item.id,
          mode: (item.mode ?? "整える") as AssistantMode,
          source: item.source,
          result: item.result,
          purpose: item.purpose as Purpose,
          writingStyle: item.writing_style as WritingStyle,
          targetLength: item.target_length,
          favorite:
            Array.isArray(item.tsumugu_favorites) &&
            item.tsumugu_favorites.length > 0,
          createdAt: item.created_at
        }))
      );
    }
  }, [supabase]);

  useEffect(() => {
    const savedHistory = window.localStorage.getItem(historyKey);
    const savedSettings = window.localStorage.getItem(settingsKey);

    if (!window.localStorage.getItem(onboardingKey)) {
      setShowOnboarding(true);
    }

    if (savedHistory) setHistory(JSON.parse(savedHistory) as HistoryItem[]);

    if (savedSettings) {
      const parsed = { ...defaultSettings, ...JSON.parse(savedSettings) } as Settings;
      setSettings(parsed);
      setPurpose(parsed.defaultPurpose);
      setWritingStyle(parsed.defaultWritingStyle);
      setLengthPreset(parsed.defaultLength);
      setCustomLength(parsed.customLength);
      applyTheme(parsed.theme);
    } else {
      applyTheme(defaultSettings.theme);
    }

    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) void loadCloudData(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setPlan(session?.user ? "free" : "guest");
      if (session?.user) void loadCloudData(session.user);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadCloudData, supabase]);

  useEffect(() => {
    window.localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 30)));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(settingsKey, JSON.stringify(settings));
    applyTheme(settings.theme);
  }, [settings]);

  async function syncSettings(nextSettings: Settings) {
    setSettings(nextSettings);
    if (!supabase || !user) return;

    await supabase.from("tsumugu_settings").upsert({
      user_id: user.id,
      default_purpose: nextSettings.defaultPurpose,
      default_writing_style: nextSettings.defaultWritingStyle,
      default_length: String(nextSettings.defaultLength),
      custom_length: nextSettings.customLength,
      theme: nextSettings.theme,
      model: nextSettings.model
    });
  }

  function closeOnboarding() {
    window.localStorage.setItem(onboardingKey, "true");
    setShowOnboarding(false);
  }

  async function signInWithGoogle() {
    if (!supabase) {
      setError({
        title: "ログイン設定が未完了です",
        message: "Supabaseの環境変数が未設定です。",
        action: "READMEを確認して、SupabaseのURLとキーを設定してください。"
      });
      return;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback` }
    });
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setPlan("guest");
  }

  function toggleAdjustment(adjustment: PolishAdjustment) {
    setSelectedAdjustments((items) =>
      items.includes(adjustment)
        ? items.filter((item) => item !== adjustment)
        : [...items, adjustment]
    );
  }

  function applyExample() {
    setText(currentExample);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setCopied(false);
    setIsLoading(true);
    setConsultAnswer("");

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {})
        },
        body: JSON.stringify({
          mode,
          text,
          purpose,
          writingStyle,
          rewriteDirection,
          polishAdjustments: selectedAdjustments,
          targetLength,
          reduceAiTone,
          highQuality: highQuality && canUseHighQuality,
          model: settings.model
        })
      });

      const data = (await response.json()) as RefineResponse;
      if (!response.ok) {
        throw createErrorState(response.status, data.error ?? "処理に失敗しました。");
      }

      const nextResult = data.result ?? "";
      setResult(nextResult);
      setImprovements(data.improvements ?? []);
      setScore(data.score ?? null);
      setUsage(data.usage ?? null);

      const item: HistoryItem = {
        id: crypto.randomUUID(),
        mode,
        source: text,
        result: nextResult,
        purpose,
        writingStyle,
        targetLength,
        favorite: false,
        createdAt: new Date().toISOString()
      };

      setHistory((items) => [item, ...items].slice(0, isPaid ? 100 : 10));
      if (user) void loadCloudData(user);
    } catch (currentError) {
      if (
        typeof currentError === "object" &&
        currentError !== null &&
        "title" in currentError
      ) {
        setError(currentError as ErrorState);
      } else {
        setError({
          title: "通信に失敗しました",
          message:
            currentError instanceof Error
              ? currentError.message
              : "ネットワークまたはブラウザ側で問題が発生しました。",
          action: "接続状況を確認して、もう一度お試しください。"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function toggleFavorite(item: HistoryItem) {
    const favoriteCount = history.filter((current) => current.favorite).length;
    if (!item.favorite && plan === "free" && favoriteCount >= 10) {
      setError({
        title: "お気に入りの上限に達しました",
        message: "Freeプランではお気に入りは10件まで保存できます。",
        action: "Student以上ではお気に入りを無制限に保存できます。"
      });
      return;
    }

    if (!supabase || !user || !item.cloudId) {
      setHistory((items) =>
        items.map((current) =>
          current.id === item.id ? { ...current, favorite: !current.favorite } : current
        )
      );
      return;
    }

    if (item.favorite) {
      await supabase
        .from("tsumugu_favorites")
        .delete()
        .eq("history_id", item.cloudId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("tsumugu_favorites")
        .insert({ user_id: user.id, history_id: item.cloudId });
    }

    await loadCloudData(user);
  }

  async function deleteHistory(item: HistoryItem) {
    if (supabase && user && item.cloudId) {
      await supabase.from("tsumugu_histories").delete().eq("id", item.cloudId);
      await loadCloudData(user);
      return;
    }

    setHistory((items) => items.filter((current) => current.id !== item.id));
  }

  function restoreHistory(item: HistoryItem) {
    setMode(item.mode);
    setText(item.source);
    setResult(item.result);
    setPurpose(item.purpose);
    setWritingStyle(item.writingStyle);
    setLengthPreset(restoreLengthPreset(item.targetLength));
    setCustomLength(item.targetLength ?? 400);
  }

  async function askConsultation(question = consultQuestion) {
    if (!activePlanConfig?.canConsult) {
      setError({
        title: "AI相談は有料プランの機能です",
        message: "整形結果について相談するにはStudent以上のプランが必要です。",
        action: "無料プランでは、整える・書き直すをそのまま利用できます。"
      });
      return;
    }

    if (!result || !question.trim()) return;
    setIsConsulting(true);
    setConsultAnswer("");
    setError(null);

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {})
        },
        body: JSON.stringify({ text: result, question })
      });

      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) {
        throw createErrorState(response.status, data.error ?? "相談に失敗しました。");
      }
      setConsultAnswer(data.answer ?? "");
    } catch (currentError) {
      setError(
        typeof currentError === "object" &&
          currentError !== null &&
          "title" in currentError
          ? (currentError as ErrorState)
          : {
              title: "相談に失敗しました",
              message:
                currentError instanceof Error
                  ? currentError.message
                  : "通信中に問題が発生しました。",
              action: "少し時間をおいて再度お試しください。"
            }
      );
    } finally {
      setIsConsulting(false);
    }
  }

  function downloadMarkdown() {
    if (!result) return;
    downloadBlob(
      `# TSUMUGU Output\n\n${result}\n`,
      "tsumugu-output.md",
      "text/markdown;charset=utf-8"
    );
  }

  function downloadWord() {
    if (!result) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>TSUMUGU</title></head><body><h1>TSUMUGU</h1><p>${escapeHtml(
      result
    ).replaceAll("\n", "<br>")}</p></body></html>`;
    downloadBlob(html, "tsumugu-output.doc", "application/msword;charset=utf-8");
  }

  function downloadPdf() {
    if (!result) return;
    const printWindow = window.open("", "_blank", "width=860,height=760");
    if (!printWindow) {
      setError({
        title: "PDF出力を開けませんでした",
        message: "ブラウザが新しいウィンドウをブロックした可能性があります。",
        action: "ポップアップ設定を確認してから、もう一度お試しください。"
      });
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html lang="ja">
        <head>
          <meta charset="utf-8" />
          <title>TSUMUGU</title>
          <style>
            body { font-family: "Yu Gothic", Meiryo, sans-serif; line-height: 1.8; padding: 40px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 24px; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>TSUMUGU</h1>
          <pre>${escapeHtml(result)}</pre>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  async function startCheckout(nextPlan: Exclude<BillingPlan, "free"> = "pro") {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session?.access_token) {
      setError({
        title: "ログインが必要です",
        message: "プラン登録にはGoogleログインが必要です。",
        action: "画面右上のGoogleログインから続行してください。"
      });
      return;
    }

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ plan: nextPlan })
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setError(createErrorState(response.status, data.error ?? "決済ページを開けませんでした。"));
      return;
    }
    window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
      {showOnboarding ? (
        <WelcomeModal
          onClose={closeOnboarding}
          onSelectMode={(nextMode) => setMode(nextMode)}
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-4 sm:gap-8 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="group rounded-[8px] focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300">
            <p className="text-xl font-semibold tracking-normal">TSUMUGU</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              あなたの言葉を、そのまま、もっと伝わる文章へ。
            </p>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-white/10 dark:text-zinc-300">
              {user ? `${plan === "guest" ? "Guest" : getPlanConfig(plan).name} / ${user.email}` : "Guest"}
            </span>
            {usage ? (
              <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-white/10 dark:text-zinc-300">
                {usage.dailyLimit ? `残り${usage.remaining}回` : "無制限"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                void syncSettings({
                  ...settings,
                  theme: settings.theme === "light" ? "dark" : "light"
                })
              }
              className="min-h-11 rounded-full border border-zinc-200 bg-white/70 px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-white active:scale-[0.98] dark:border-zinc-800 dark:bg-white/10 dark:text-zinc-100"
            >
              {settings.theme === "light" ? "Dark" : "Light"}
            </button>
            {user ? (
              <button type="button" onClick={() => void signOut()} className="min-h-11 rounded-full border border-zinc-200 bg-white/70 px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-white active:scale-[0.98] dark:border-zinc-800 dark:bg-white/10 dark:text-zinc-100">
                ログアウト
              </button>
            ) : (
              <button type="button" onClick={() => void signInWithGoogle()} className="min-h-11 rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950">
                Googleでログイン
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="min-h-11 rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950"
            >
              設定
            </button>
          </div>
        </header>

        <section className="space-y-5 rounded-[10px] border border-white/80 bg-white/76 p-5 shadow-[0_20px_80px_rgba(24,24,27,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-8">
          <div>
            <p className="text-sm font-medium text-sky-600 dark:text-sky-300">
              TSUMUGUは、自分の文章を育てるサービスです。
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
              今日は何をしたいですか？
            </h1>
          </div>
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="作業モード">
            {modeCards.map((card) => {
              const active = mode === card.mode;
              const locked = card.access === "paid" && !activePlanConfig?.canCreate;
              return (
                <button
                  key={card.mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-describedby={`${card.mode}-description`}
                  onClick={() => setMode(card.mode)}
                  className={`group rounded-[10px] border p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] ${
                    active
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200 bg-white/70 hover:border-zinc-400 hover:bg-white dark:border-zinc-800 dark:bg-white/5 dark:hover:border-zinc-600"
                  }`}
                >
                  <span aria-hidden="true" className="text-2xl">{card.icon}</span>
                  <span className="mt-4 block text-lg font-semibold">
                    {card.title}
                    {locked ? <span className="ml-2 text-xs opacity-70">Student+</span> : null}
                  </span>
                  <span className="mt-1 block text-sm font-medium opacity-75">
                    {card.subtitle}
                  </span>
                  <span id={`${card.mode}-description`} className="mt-3 block text-sm leading-6 opacity-75">
                    {card.description}
                  </span>
                </button>
              );
            })}
          </div>
          {!canUseMode ? (
            <div className="rounded-[10px] border border-sky-100 bg-sky-50 p-4 text-sm leading-7 text-sky-950 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100">
              「作成する」、文字数指定、AI相談、TSUMUGU ScoreはStudent以上で利用できます。高品質モードはPro以上の特典です。
              <button
                type="button"
                onClick={() => void startCheckout("student")}
                className="ml-3 rounded-full bg-sky-200 px-3 py-1 text-xs font-semibold text-sky-950 transition hover:bg-sky-300"
              >
                料金を見る
              </button>
            </div>
          ) : null}
          {!user ? (
            <div className="rounded-[10px] border border-zinc-200 bg-white/80 p-4 text-sm leading-7 text-zinc-700 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-200">
              TSUMUGU β版ではOpenAI API保護のためログインが必要です。Freeプランは1日10回まで無料で使えます。
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="ml-3 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
              >
                Googleでログイン
              </button>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="space-y-4 lg:sticky lg:top-6">
            <section className="rounded-[10px] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <h2 className="text-sm font-semibold">このモードの考え方</h2>
              {mode === "整える" ? (
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  意味、情報量、主張は変えません。文体、敬語、読みやすさ、AIっぽさだけを整えます。
                </p>
              ) : null}
              {mode === "書き直す" ? (
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  情報は基本的に維持しながら、伝え方や温度感を変えます。必要最低限の補足だけ許可します。
                </p>
              ) : null}
              {mode === "作成する" ? (
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  メモや箇条書きから文章を作ります。ここではAIによる補足と文字数指定を許可します。
                </p>
              ) : null}
            </section>

            {settingsOpen ? (
              <section className="rounded-[10px] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">設定</h2>
                  <button
                    type="button"
                    onClick={() => setShowOnboarding(true)}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300"
                  >
                    初回ガイドを再表示
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  <OptionGroup
                    label="デフォルト用途"
                    options={purposeOptions}
                    value={settings.defaultPurpose}
                    onChange={(value) => {
                      setPurpose(value);
                      void syncSettings({ ...settings, defaultPurpose: value });
                    }}
                    compact
                  />
                  <OptionGroup
                    label="デフォルト文体"
                    options={writingStyles}
                    value={settings.defaultWritingStyle}
                    onChange={(value) => {
                      setWritingStyle(value);
                      void syncSettings({ ...settings, defaultWritingStyle: value });
                    }}
                    compact
                  />
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    AIモデル
                    <select
                      value={settings.model}
                      onChange={(event) =>
                        void syncSettings({
                          ...settings,
                          model: event.target.value as ModelOption
                        })
                      }
                      className="mt-2 min-h-11 w-full rounded-[8px] border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      {modelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            ) : null}

            <aside
              aria-label="スポンサー枠"
              className="rounded-[10px] border border-dashed border-zinc-300 bg-white/60 p-5 text-sm leading-7 text-zinc-600 shadow-sm backdrop-blur-xl dark:border-zinc-700 dark:bg-white/5 dark:text-zinc-300"
            >
              <p className="text-xs font-semibold text-zinc-500">β版広告枠</p>
              <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                スポンサー募集中
              </p>
              <p className="mt-1">
                正式版までは広告を表示しません。0→1 Labのサービス紹介や、将来のAdSense枠として使える余白です。
              </p>
            </aside>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <section className="rounded-[10px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="source-text" className="text-sm font-semibold">
                  入力
                </label>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enterで実行 / Shift+Enterで改行
                </span>
              </div>
              <textarea
                ref={inputRef}
                id="source-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  mode === "作成する"
                    ? "企画案、目的、ターゲット、入れたいキーワードを箇条書きで入力"
                    : "いまの文章やメモをそのまま貼り付けてください"
                }
                aria-describedby="input-help"
                className="min-h-48 w-full resize-none rounded-[8px] border border-zinc-200 bg-white/90 px-4 py-4 text-base leading-8 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-50 dark:focus:ring-white/10"
              />
              <div id="input-help" className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{countText(text)}文字</span>
                <span>
                  {mode === "整える"
                    ? "情報量は変えません"
                    : mode === "書き直す"
                      ? "同じ内容を別の伝え方へ"
                      : "メモから文章を作成します"}
                </span>
              </div>
              {!text ? (
                <button
                  type="button"
                  onClick={applyExample}
                  className="mt-4 w-full rounded-[10px] border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-left text-sm leading-7 text-zinc-600 transition hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <span className="block font-semibold text-zinc-800 dark:text-zinc-100">入力例を使う</span>
                  <span className="mt-2 block whitespace-pre-wrap">{currentExample}</span>
                </button>
              ) : null}
            </section>

            <section className="grid gap-4 rounded-[10px] border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
              <OptionGroup label="用途" options={purposeOptions} value={purpose} onChange={setPurpose} />
              <OptionGroup label="文体" options={writingStyles} value={writingStyle} onChange={setWritingStyle} />

              {mode === "整える" ? (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    調整すること
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {polishAdjustments.map((adjustment) => {
                      const active = selectedAdjustments.includes(adjustment);
                      return (
                        <button
                          key={adjustment}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleAdjustment(adjustment)}
                          className={`min-h-11 rounded-full border px-3 text-sm font-medium transition active:scale-[0.98] ${
                            active
                              ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                              : "border-zinc-200 bg-white/70 text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-200"
                          }`}
                        >
                          {adjustment}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {mode === "書き直す" ? (
                <OptionGroup
                  label="書き直し方向"
                  options={rewriteDirections}
                  value={rewriteDirection}
                  onChange={setRewriteDirection}
                />
              ) : null}

              {mode === "作成する" ? (
                <div className="space-y-2">
                  <OptionGroup
                    label="文字数"
                    options={lengthPresets}
                    value={lengthPreset}
                    onChange={(value) => {
                      setLengthPreset(value);
                      void syncSettings({ ...settings, defaultLength: value });
                    }}
                  />
                  {lengthPreset === "自由入力" ? (
                    <input
                      type="number"
                      min={40}
                      max={4000}
                      value={customLength}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setCustomLength(value);
                        void syncSettings({ ...settings, customLength: value });
                      }}
                      className="min-h-11 w-full rounded-[8px] border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-[8px] border border-zinc-200 bg-white/70 px-4 py-3 transition hover:bg-white dark:border-zinc-800 dark:bg-white/5">
                  <span>
                    <span className="block text-sm font-semibold">AIっぽさを減らす</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      不自然な接続詞や定型表現を避けます
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={reduceAiTone}
                    onChange={(event) => setReduceAiTone(event.target.checked)}
                    className="h-5 w-5 accent-zinc-950 dark:accent-white"
                  />
                </label>
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-[8px] border border-zinc-200 bg-white/70 px-4 py-3 transition hover:bg-white dark:border-zinc-800 dark:bg-white/5">
                  <span>
                    <span className="block text-sm font-semibold">高品質モード</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {canUseHighQuality ? "Pro / Supporter特典です" : "Pro以上で利用できます"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={highQuality && canUseHighQuality}
                    disabled={!canUseHighQuality}
                    onChange={(event) => setHighQuality(event.target.checked)}
                    className="h-5 w-5 accent-sky-500 disabled:opacity-40"
                  />
                </label>
              </div>

              {error ? <ErrorCard error={error} /> : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="relative min-h-12 overflow-hidden rounded-[8px] bg-zinc-950 px-5 py-3 text-base font-semibold text-white shadow-sm transition duration-200 hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
                    処理しています
                  </span>
                ) : (
                  mode
                )}
              </button>
            </section>

            <section className="rounded-[10px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">出力</h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {result ? `${countText(result)}文字` : "結果がここに表示されます"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleCopy} disabled={!result} className="tool-button">
                    {copied ? "コピーしました" : "コピー"}
                  </button>
                  <button type="button" onClick={downloadMarkdown} disabled={!result} className="tool-button">Markdown</button>
                  <button type="button" onClick={downloadWord} disabled={!result} className="tool-button">Word</button>
                  <button type="button" onClick={downloadPdf} disabled={!result} className="tool-button">PDF</button>
                </div>
              </div>
              <div className="min-h-48 whitespace-pre-wrap rounded-[8px] border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-base leading-8 text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-50">
                {isLoading ? (
                  <OutputSkeleton />
                ) : (
                  result || <span className="text-zinc-400">まだ出力はありません。</span>
                )}
              </div>
            </section>

            {improvements.length > 0 ? (
              <section className="rounded-[10px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
                <h2 className="mb-3 text-sm font-semibold">改善内容</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {improvements.map((item) => (
                    <article key={item.title} className="rounded-[8px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        <span aria-hidden="true" className="mr-2 text-sky-500">✓</span>
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {score && activePlanConfig?.canUseScore ? (
              <section className="rounded-[10px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
                <h2 className="mb-3 text-sm font-semibold">TSUMUGU Score</h2>
                <div className="grid gap-3 md:grid-cols-[0.5fr_1fr]">
                  <div className="rounded-[8px] bg-zinc-950 p-5 text-white dark:bg-white dark:text-zinc-950">
                    <p className="text-xs opacity-70">総合スコア</p>
                    <p className="mt-1 text-4xl font-semibold">{score.total}</p>
                  </div>
                  <div className="grid gap-2">
                    {scoreLabels.map(([key, label]) => (
                      <div key={key} className="rounded-[8px] border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-500">
                          <span>{label}</span>
                          <span>{score[key]}</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div className="h-2 rounded-full bg-sky-300" style={{ width: `${score[key]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {result ? (
              <section className="rounded-[10px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
                <h2 className="text-sm font-semibold">AIライティング相談</h2>
                {!activePlanConfig?.canConsult ? (
                  <p className="mt-2 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                    AI相談はStudent以上のプランで利用できます。
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["この文章は失礼？", "面接官からどう見える？", "もっと短くできる？", "説得力ある？"].map((question) => (
                        <button key={question} type="button" onClick={() => { setConsultQuestion(question); void askConsultation(question); }} className="tool-button">
                          {question}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input value={consultQuestion} onChange={(event) => setConsultQuestion(event.target.value)} className="min-h-11 flex-1 rounded-[8px] border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900" />
                      <button type="button" onClick={() => void askConsultation()} disabled={isConsulting} className="min-h-11 rounded-[8px] bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">
                        {isConsulting ? "相談中" : "相談"}
                      </button>
                    </div>
                    {consultAnswer ? (
                      <p className="mt-4 whitespace-pre-wrap rounded-[8px] border border-zinc-200 bg-white/80 p-4 text-sm leading-7 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-200">
                        {consultAnswer}
                      </p>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}

            {text && result ? (
              <section className="rounded-[10px] border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
                <h2 className="mb-3 text-sm font-semibold">比較</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[8px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <p className="mb-2 text-xs font-semibold text-zinc-500">元文章</p>
                    <div className="whitespace-pre-wrap text-sm leading-7">{compareText(text, result, "source")}</div>
                  </div>
                  <div className="rounded-[8px] border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <p className="mb-2 text-xs font-semibold text-zinc-500">結果</p>
                    <div className="whitespace-pre-wrap text-sm leading-7">{compareText(result, text, "result")}</div>
                  </div>
                </div>
              </section>
            ) : null}
          </form>
        </section>

        <section className="rounded-[10px] border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">履歴</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {user ? "クラウド同期中。検索、削除、お気に入り登録ができます。" : "ゲスト中はこの端末に保存されます。Googleログインでクラウド同期できます。"}
              </p>
            </div>
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="履歴を検索"
              className="min-h-11 w-full rounded-full border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 sm:w-72"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <article key={item.id} className="rounded-[8px] border border-zinc-200 bg-white/80 p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500">
                      {item.mode} / {new Date(item.createdAt).toLocaleString("ja-JP")}
                    </p>
                    <button type="button" onClick={() => void toggleFavorite(item)} className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10">
                      {item.favorite ? "お気に入り" : "登録"}
                    </button>
                  </div>
                  <p className="max-h-24 overflow-hidden whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">{item.result}</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => restoreHistory(item)} className="history-button">戻す</button>
                    <button type="button" onClick={() => void deleteHistory(item)} className="history-button">削除</button>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-[10px] border border-dashed border-zinc-300 bg-zinc-50/70 p-8 text-center dark:border-zinc-700 dark:bg-white/5">
                <p aria-hidden="true" className="text-4xl">✍️</p>
                <p className="mt-4 text-sm font-semibold">まだ履歴はありません。</p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  最初の文章を整えてみましょう。
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
