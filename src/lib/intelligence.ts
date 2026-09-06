import type { NormalizedDependency, NormalizedRepository, RepositoryDetail } from "./providers/types";

/** AI category taxonomy, matched against real signals only. */
const CATEGORY_RULES: { category: string; deps: string[]; keywords: string[] }[] = [
  {
    category: "LLM",
    deps: ["openai", "anthropic", "@anthropic-ai/sdk", "cohere", "mistralai", "litellm", "groq", "ollama", "tiktoken", "@ai-sdk/openai", "ai"],
    keywords: ["llm", "gpt", "claude", "gemini", "mistral", "prompt", "chat completion", "large language model"],
  },
  {
    category: "AI AGENTS",
    deps: ["langgraph", "crewai", "autogen", "pyautogen", "smolagents", "agno", "phidata", "openai-agents"],
    keywords: ["agent", "multi-agent", "autonomous", "tool calling", "mcp"],
  },
  {
    category: "RAG",
    deps: ["llama-index", "llama_index", "llamaindex", "chromadb", "pinecone-client", "@pinecone-database/pinecone", "weaviate-client", "qdrant-client", "faiss-cpu", "pgvector", "sentence-transformers"],
    keywords: ["rag", "retrieval", "vector store", "embedding", "semantic search", "knowledge base"],
  },
  {
    category: "VISION",
    deps: ["opencv-python", "opencv-contrib-python", "ultralytics", "pillow", "torchvision", "mediapipe", "easyocr", "pytesseract"],
    keywords: ["computer vision", "image recognition", "object detection", "yolo", "ocr", "segmentation"],
  },
  {
    category: "MACHINE LEARNING",
    deps: ["torch", "pytorch", "tensorflow", "keras", "scikit-learn", "sklearn", "xgboost", "lightgbm", "jax", "pandas", "numpy"],
    keywords: ["machine learning", "neural network", "training", "dataset", "model training", "deep learning"],
  },
  {
    category: "GENERATIVE AI",
    deps: ["diffusers", "stable-diffusion", "replicate", "elevenlabs", "@huggingface/inference", "comfyui"],
    keywords: ["generative", "text-to-image", "diffusion", "image generation", "tts", "voice synthesis"],
  },
  {
    category: "TRADING AI",
    deps: ["ccxt", "backtrader", "ta-lib", "yfinance", "alpaca-trade-api", "vectorbt", "pandas-ta"],
    keywords: ["trading", "backtest", "algo trading", "market data", "portfolio", "candlestick", "quant"],
  },
  {
    category: "AUTOMATION",
    deps: ["playwright", "puppeteer", "selenium", "n8n", "apscheduler", "celery", "scrapy"],
    keywords: ["automation", "scraper", "workflow automation", "bot", "pipeline", "scheduler"],
  },
  {
    category: "TOOLS",
    deps: ["gradio", "streamlit", "langsmith", "wandb", "mlflow", "transformers", "huggingface-hub", "datasets", "accelerate"],
    keywords: ["hugging face", "inference", "fine-tune", "model hub", "experiment tracking"],
  },
];

export interface AiClassification {
  isAiProject: boolean;
  categories: string[];
  signals: string[];
  confidence: number;
}

export function classifyAi(
  repo: NormalizedRepository,
  detail: Pick<RepositoryDetail, "dependencies" | "readme">,
): AiClassification {
  const depNames = new Set(detail.dependencies.map((d: NormalizedDependency) => d.name.toLowerCase()));
  const haystack = [repo.name, repo.description ?? "", repo.topics.join(" "), (detail.readme ?? "").slice(0, 8000)]
    .join(" ")
    .toLowerCase();

  const categories = new Set<string>();
  const signals: string[] = [];
  let score = 0;

  for (const rule of CATEGORY_RULES) {
    let hit = false;
    for (const dep of rule.deps) {
      if (depNames.has(dep.toLowerCase())) {
        signals.push(`dependency:${dep}`);
        score += 30; // a real dependency is the strongest signal
        hit = true;
      }
    }
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) {
        signals.push(`keyword:${kw}`);
        score += 8;
        hit = true;
      }
    }
    if (hit) categories.add(rule.category);
  }

  for (const topic of repo.topics) {
    if (/^(ai|ml|llm|rag|nlp|genai|machine-learning|deep-learning|artificial-intelligence)$/.test(topic)) {
      signals.push(`topic:${topic}`);
      score += 20;
    }
  }

  const confidence = Math.min(100, score);
  return {
    isAiProject: confidence >= 30,
    categories: [...categories],
    signals: [...new Set(signals)].slice(0, 24),
    confidence,
  };
}

export interface HealthResult {
  score: number;
  factors: { label: string; ok: boolean; detail: string }[];
}

const DAY = 86_400_000;

export function computeHealth(input: {
  pushedAt: Date | null;
  isArchived: boolean;
  ciStatus: string | null;
  openIssues: number;
  openPullRequests: number;
  hasReadme: boolean;
  hasDocs: boolean;
  hasReleases?: boolean;
}): HealthResult {
  const factors: HealthResult["factors"] = [];
  let score = 100;

  const daysIdle = input.pushedAt ? Math.floor((Date.now() - input.pushedAt.getTime()) / DAY) : null;
  if (daysIdle === null) {
    score -= 25;
    factors.push({ label: "ACTIVITY", ok: false, detail: "NO ACTIVITY DATA" });
  } else if (daysIdle <= 14) {
    factors.push({ label: "RECENT ACTIVITY", ok: true, detail: `${daysIdle}D AGO` });
  } else if (daysIdle <= 90) {
    score -= 12;
    factors.push({ label: "ACTIVITY", ok: true, detail: `${daysIdle}D AGO` });
  } else {
    score -= 30;
    factors.push({ label: "STALE", ok: false, detail: `${daysIdle}D IDLE` });
  }

  if (input.isArchived) {
    score -= 25;
    factors.push({ label: "ARCHIVED", ok: false, detail: "READ ONLY" });
  } else {
    factors.push({ label: "ACTIVE", ok: true, detail: "NOT ARCHIVED" });
  }

  switch (input.ciStatus) {
    case "success":
      factors.push({ label: "CI PASSING", ok: true, detail: "LAST RUN OK" });
      break;
    case "failure":
      score -= 30;
      factors.push({ label: "CI FAILING", ok: false, detail: "LAST RUN FAILED" });
      break;
    case "pending":
      factors.push({ label: "CI RUNNING", ok: true, detail: "IN PROGRESS" });
      break;
    default:
      score -= 5;
      factors.push({ label: "NO CI", ok: false, detail: "NO WORKFLOWS" });
  }

  if (input.openIssues === 0) factors.push({ label: "NO OPEN ISSUES", ok: true, detail: "0 OPEN" });
  else if (input.openIssues <= 10) factors.push({ label: "LOW ISSUE LOAD", ok: true, detail: `${input.openIssues} OPEN` });
  else {
    score -= Math.min(20, input.openIssues);
    factors.push({ label: "HIGH ISSUE LOAD", ok: false, detail: `${input.openIssues} OPEN` });
  }

  if (input.openPullRequests > 5) {
    score -= 10;
    factors.push({ label: "PR BACKLOG", ok: false, detail: `${input.openPullRequests} OPEN` });
  }

  if (input.hasReadme) factors.push({ label: "DOCUMENTED", ok: true, detail: input.hasDocs ? "README + DOCS" : "README" });
  else {
    score -= 10;
    factors.push({ label: "NO README", ok: false, detail: "MISSING" });
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), factors };
}

export type AttentionFlag = {
  code: string;
  severity: "critical" | "warning" | "info";
  detail: string;
};

export function computeAttention(input: {
  pushedAt: Date | null;
  isArchived: boolean;
  ciStatus: string | null;
  openIssues: number;
  openPullRequests: number;
  hasReadme: boolean;
}): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  const daysIdle = input.pushedAt ? Math.floor((Date.now() - input.pushedAt.getTime()) / DAY) : null;

  if (input.ciStatus === "failure") flags.push({ code: "CI FAILURE", severity: "critical", detail: "LAST WORKFLOW FAILED" });
  if (!input.isArchived && daysIdle !== null && daysIdle > 180)
    flags.push({ code: "STALE PROJECT", severity: "warning", detail: `${daysIdle} DAYS WITHOUT ACTIVITY` });
  if (input.openPullRequests > 0)
    flags.push({
      code: "OPEN PR",
      severity: input.openPullRequests > 5 ? "warning" : "info",
      detail: `${input.openPullRequests} PULL REQUEST${input.openPullRequests > 1 ? "S" : ""} WAITING`,
    });
  if (input.openIssues > 10)
    flags.push({ code: "OPEN ISSUES", severity: "warning", detail: `${input.openIssues} ISSUES OPEN` });
  if (!input.hasReadme) flags.push({ code: "NO DOCUMENTATION", severity: "info", detail: "README MISSING" });

  return flags;
}
