import type { Topic, TopicStock, TopicTrend } from "@/lib/topics";
import { topicUniverse } from "@/lib/topics";

const defaultServiceUrl = "http://127.0.0.1:8090";
const serviceRequestTimeoutMs = 5_000;

export type TopicSnapshot = {
  topics: Topic[];
  mode: "demo" | "free-data";
  note: string;
};

export type FreeQuote = {
  code: string;
  as_of: string;
  price: number;
  change: number;
  change_percent: number;
  amount: number;
};

export type FreeHistoryRow = {
  date: string;
  code: string;
  close: string;
  preclose: string;
  amount: string;
  pctChg: string;
  [key: string]: string;
};

type FreeQuotePayload = {
  provider: string;
  items: FreeQuote[];
};

type FreeHistoryPayload = {
  provider: string;
  items: FreeHistoryRow[];
};

type FreeTopicMember = {
  code: string;
  name: string;
  price: number;
  change_percent: number;
  amount: string;
  status: string;
  rank: number;
  as_of: string;
};

type FreeTopic = {
  id: string;
  name: string;
  category: string;
  index_code: string;
  members: FreeTopicMember[];
  member_count: number;
  updated_at: string;
  data_status: string;
  heat: number;
  change_percent: number;
  up_count: number;
  down_count: number;
  flat_count: number;
  limit_up_count: number;
  limit_up_30_count: number;
  continuation_days: number;
  turnover: string;
  rank_times: number;
  trend: string;
  history: Array<{ date: string; change_percent: number; limit_up_count: number; heat: number }>;
};

function getServiceUrl() {
  return (process.env.MUCHEN_DATA_SERVICE_URL ?? defaultServiceUrl).replace(/\/$/, "");
}

export function isFreeDataEnabled() {
  return process.env.MUCHEN_DATA_MODE === "free-data";
}

async function fetchFreeJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serviceRequestTimeoutMs);
  try {
    const response = await fetch(`${getServiceUrl()}${path}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`本地免费数据服务返回 ${response.status}`);
    return response.json() as Promise<T>;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("本地免费数据服务响应超时");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFreeQuotes(codes: string[]) {
  return fetchFreeJson<FreeQuotePayload>(`/api/quotes?codes=${encodeURIComponent(codes.join(","))}`);
}

export async function fetchFreeHistory(code: string, startDate?: string, endDate?: string) {
  const query = new URLSearchParams();
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchFreeJson<FreeHistoryPayload>(`/api/stock/${encodeURIComponent(code)}/history${suffix}`);
}

export async function fetchFreeStockConcepts(code: string) {
  return fetchFreeJson<{ items: Array<{ concept_code: string; name: string; source: string; reason: string }> }>(`/api/stock/${encodeURIComponent(code)}/concepts`);
}

function toTopicTrend(value: string): TopicTrend {
  if (value === "强化" || value === "新启动" || value === "分歧" || value === "退潮") return value;
  return "分歧";
}

function toTopicStock(member: FreeTopicMember): TopicStock {
  const status: TopicStock["status"] = member.status === "龙头" || member.status === "连板" || member.status === "强势" ? member.status : "观察";
  return {
    code: member.code,
    name: member.name,
    price: member.price,
    changePercent: member.change_percent,
    amount: member.amount,
    status,
    rank: member.rank
  };
}

export async function fetchFreeTopics(): Promise<Topic[]> {
  const payload = await fetchFreeJson<{ items: FreeTopic[]; refreshing?: boolean }>("/api/topics");
  if (!payload.items.length) throw new Error(payload.refreshing ? "题材数据正在后台更新" : "题材数据暂不可用");
  return payload.items.map((item) => {
    const template = topicUniverse.find((topic) => topic.id === item.id);
    const members = item.members.map(toTopicStock);
    const leader = members[0] ?? template?.leader;
    if (!template || !leader) throw new Error(`免费题材数据缺少模板：${item.id}`);
    return {
      ...template,
      name: item.name,
      description: `同花顺公开题材「${item.name}」，当前统计由腾讯财经公开行情样本计算。${template.description}`,
      trend: toTopicTrend(item.trend),
      heat: item.heat,
      changePercent: item.change_percent,
      upCount: item.up_count,
      downCount: item.down_count,
      flatCount: item.flat_count,
      limitUpCount: item.limit_up_count,
      limitUp30Count: item.limit_up_30_count,
      continuationDays: item.continuation_days,
      turnover: item.turnover,
      rankTimes: item.rank_times,
      leader,
      members,
      history: item.history.map((point) => ({
        date: point.date,
        changePercent: point.change_percent,
        limitUpCount: point.limit_up_count,
        heat: point.heat
      })),
      events: [],
      relations: [],
      dataStatus: "free-data",
      asOf: item.updated_at
    };
  });
}

export async function getTopicSnapshot(): Promise<TopicSnapshot> {
  if (!isFreeDataEnabled()) return { topics: topicUniverse, mode: "demo", note: "演示数据 · 可替换 Provider" };
  try {
    const topics = await fetchFreeTopics();
    return { topics, mode: "free-data", note: "腾讯行情 + 同花顺题材 · 题材成分样本与最新交易日行情" };
  } catch {
    return { topics: topicUniverse, mode: "demo", note: "本地数据服务暂不可用 · 已回退演示数据" };
  }
}
