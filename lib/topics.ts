export type TopicTrend = "强化" | "分歧" | "退潮" | "新启动";

export type TopicStock = {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  amount: string;
  status: "龙头" | "连板" | "强势" | "观察";
  rank: number;
};

export type TopicHistoryPoint = {
  date: string;
  changePercent: number;
  limitUpCount: number;
  heat: number;
};

export type TopicEvent = {
  id: string;
  date: string;
  time: string;
  type: "新题材" | "新事件" | "公告" | "资金";
  title: string;
  summary: string;
  tone: "positive" | "neutral" | "negative";
};

export type TopicRelation = {
  id: string;
  name: string;
  kind: "上游" | "下游" | "关联";
};

export type Topic = {
  id: string;
  name: string;
  category: string;
  description: string;
  trend: TopicTrend;
  heat: number;
  changePercent: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  limitUpCount: number;
  limitUp30Count: number;
  continuationDays: number;
  turnover: string;
  rankTimes: number;
  leader: TopicStock;
  members: TopicStock[];
  history: TopicHistoryPoint[];
  events: TopicEvent[];
  relations: TopicRelation[];
  dataStatus?: "demo" | "free-data";
  asOf?: string;
};

export const topicLatestDate = "2026-09-01";

const history = (values: Array<[string, number, number, number]>): TopicHistoryPoint[] =>
  values.map(([date, changePercent, limitUpCount, heat]) => ({ date, changePercent, limitUpCount, heat }));

export const topicUniverse: Topic[] = [
  {
    id: "ai-compute",
    name: "AI 算力",
    category: "科技成长",
    description: "围绕算力基础设施、服务器、液冷和高速连接形成的产业链题材，近期资金活跃度较高。",
    trend: "强化",
    heat: 92,
    changePercent: 4.86,
    upCount: 38,
    downCount: 6,
    flatCount: 3,
    limitUpCount: 7,
    limitUp30Count: 42,
    continuationDays: 4,
    turnover: "486.2 亿",
    rankTimes: 8,
    leader: { code: "000977.SZ", name: "浪潮信息", price: 58.32, changePercent: 9.98, amount: "76.4 亿", status: "龙头", rank: 1 },
    members: [
      { code: "000977.SZ", name: "浪潮信息", price: 58.32, changePercent: 9.98, amount: "76.4 亿", status: "龙头", rank: 1 },
      { code: "603019.SH", name: "中科曙光", price: 69.18, changePercent: 7.24, amount: "51.7 亿", status: "强势", rank: 2 },
      { code: "300308.SZ", name: "中际旭创", price: 132.6, changePercent: 6.41, amount: "48.9 亿", status: "强势", rank: 3 },
      { code: "300570.SZ", name: "太辰光", price: 78.44, changePercent: 4.92, amount: "18.3 亿", status: "观察", rank: 4 },
      { code: "002837.SZ", name: "英维克", price: 42.15, changePercent: 3.86, amount: "15.7 亿", status: "观察", rank: 5 }
    ],
    history: history([
      ["08-26", 1.28, 3, 70], ["08-27", 2.94, 5, 78], ["08-28", -0.68, 2, 74], ["08-29", 3.72, 6, 86], ["08-31", 4.15, 8, 90], ["09-01", 4.86, 7, 92]
    ]),
    events: [
      { id: "ai-1", date: "09-01", time: "10:42", type: "资金", title: "AI 算力成交额继续抬升", summary: "板块成交额较昨日同期增加，光模块和服务器方向同步走强。", tone: "positive" },
      { id: "ai-2", date: "08-31", time: "14:18", type: "公告", title: "多家产业链公司披露订单进展", summary: "订单和产能利用率信息改善市场对景气度的预期。", tone: "positive" }
    ],
    relations: [{ id: "semiconductor", name: "半导体设备", kind: "上游" }, { id: "data-center", name: "数据中心", kind: "关联" }, { id: "robotics", name: "人形机器人", kind: "下游" }]
  },
  {
    id: "semiconductor",
    name: "半导体设备",
    category: "先进制造",
    description: "国产设备、零部件和先进制程扩产相关的产业链题材，具备较强的产业趋势属性。",
    trend: "强化",
    heat: 86,
    changePercent: 3.72,
    upCount: 31,
    downCount: 8,
    flatCount: 5,
    limitUpCount: 5,
    limitUp30Count: 29,
    continuationDays: 3,
    turnover: "318.7 亿",
    rankTimes: 7,
    leader: { code: "688012.SH", name: "中微公司", price: 168.9, changePercent: 8.15, amount: "31.2 亿", status: "龙头", rank: 1 },
    members: [
      { code: "688012.SH", name: "中微公司", price: 168.9, changePercent: 8.15, amount: "31.2 亿", status: "龙头", rank: 1 },
      { code: "688037.SH", name: "芯源微", price: 119.64, changePercent: 6.48, amount: "16.8 亿", status: "强势", rank: 2 },
      { code: "688120.SH", name: "华海清科", price: 83.27, changePercent: 4.76, amount: "12.6 亿", status: "强势", rank: 3 },
      { code: "002371.SZ", name: "北方华创", price: 352.1, changePercent: 3.02, amount: "42.5 亿", status: "观察", rank: 4 }
    ],
    history: history([
      ["08-26", 0.84, 2, 66], ["08-27", 1.75, 3, 72], ["08-28", 2.41, 4, 80], ["08-29", -1.2, 1, 71], ["08-31", 3.08, 5, 83], ["09-01", 3.72, 5, 86]
    ]),
    events: [
      { id: "semi-1", date: "09-01", time: "09:56", type: "公告", title: "先进制程扩产预期升温", summary: "设备订单和国产替代线索成为盘中主要催化。", tone: "positive" },
      { id: "semi-2", date: "08-29", time: "13:25", type: "资金", title: "科创板设备股出现集中放量", summary: "成交额和上涨家数同步改善，但分化仍然明显。", tone: "neutral" }
    ],
    relations: [{ id: "ai-compute", name: "AI 算力", kind: "下游" }, { id: "new-energy", name: "固态电池", kind: "关联" }]
  },
  {
    id: "robotics",
    name: "人形机器人",
    category: "先进制造",
    description: "机器人本体、执行器、减速器和传感器相关题材，产业事件驱动明显。",
    trend: "新启动",
    heat: 81,
    changePercent: 5.42,
    upCount: 27,
    downCount: 9,
    flatCount: 4,
    limitUpCount: 6,
    limitUp30Count: 18,
    continuationDays: 2,
    turnover: "264.1 亿",
    rankTimes: 4,
    leader: { code: "002355.SZ", name: "兴民智通", price: 9.84, changePercent: 10.06, amount: "22.5 亿", status: "龙头", rank: 1 },
    members: [
      { code: "002355.SZ", name: "兴民智通", price: 9.84, changePercent: 10.06, amount: "22.5 亿", status: "龙头", rank: 1 },
      { code: "002747.SZ", name: "埃斯顿", price: 23.18, changePercent: 7.84, amount: "19.4 亿", status: "连板", rank: 2 },
      { code: "688017.SH", name: "绿的谐波", price: 112.3, changePercent: 6.15, amount: "10.8 亿", status: "强势", rank: 3 },
      { code: "603728.SH", name: "鸣志电器", price: 72.42, changePercent: 4.67, amount: "9.6 亿", status: "观察", rank: 4 }
    ],
    history: history([
      ["08-26", -0.42, 1, 54], ["08-27", 0.68, 1, 57], ["08-28", 1.14, 2, 63], ["08-29", 0.36, 1, 61], ["08-31", 4.93, 5, 77], ["09-01", 5.42, 6, 81]
    ]),
    events: [
      { id: "robot-1", date: "09-01", time: "10:18", type: "新事件", title: "新款执行器方案进入量产验证", summary: "产业链多家公司同步活跃，题材从事件脉冲转向扩散观察。", tone: "positive" },
      { id: "robot-2", date: "08-31", time: "11:06", type: "新题材", title: "机器人零部件出现联动", summary: "减速器、丝杠和电机方向出现首批涨停。", tone: "neutral" }
    ],
    relations: [{ id: "ai-compute", name: "AI 算力", kind: "关联" }, { id: "new-energy", name: "固态电池", kind: "关联" }]
  },
  {
    id: "low-altitude",
    name: "低空经济",
    category: "主题投资",
    description: "低空基础设施、飞行器和空域服务相关的政策与产业链题材，当前处于高位分歧阶段。",
    trend: "分歧",
    heat: 74,
    changePercent: 1.36,
    upCount: 22,
    downCount: 17,
    flatCount: 5,
    limitUpCount: 3,
    limitUp30Count: 33,
    continuationDays: 1,
    turnover: "207.5 亿",
    rankTimes: 6,
    leader: { code: "002085.SZ", name: "万丰奥威", price: 19.72, changePercent: 6.84, amount: "34.2 亿", status: "龙头", rank: 1 },
    members: [
      { code: "002085.SZ", name: "万丰奥威", price: 19.72, changePercent: 6.84, amount: "34.2 亿", status: "龙头", rank: 1 },
      { code: "000099.SZ", name: "中信海直", price: 24.65, changePercent: 3.12, amount: "22.1 亿", status: "强势", rank: 2 },
      { code: "300762.SZ", name: "上海瀚讯", price: 34.05, changePercent: 1.08, amount: "8.4 亿", status: "观察", rank: 3 },
      { code: "002111.SZ", name: "威海广泰", price: 13.98, changePercent: -0.52, amount: "4.7 亿", status: "观察", rank: 4 }
    ],
    history: history([
      ["08-26", 3.44, 5, 78], ["08-27", 2.86, 4, 80], ["08-28", -1.42, 2, 72], ["08-29", 0.18, 2, 70], ["08-31", -0.84, 1, 68], ["09-01", 1.36, 3, 74]
    ]),
    events: [
      { id: "low-1", date: "09-01", time: "10:05", type: "公告", title: "区域低空基础设施规划更新", summary: "政策预期提供支撑，但板块内部仍以高低切换为主。", tone: "neutral" },
      { id: "low-2", date: "08-29", time: "14:32", type: "资金", title: "高位股分歧扩大", summary: "领涨股冲高回落，短线关注题材宽度能否修复。", tone: "negative" }
    ],
    relations: [{ id: "robotics", name: "人形机器人", kind: "关联" }, { id: "satellite", name: "卫星互联网", kind: "上游" }]
  },
  {
    id: "new-energy",
    name: "固态电池",
    category: "新能源",
    description: "固态电解质、材料和电池设备相关的技术路线题材，近期有产业消息催化但持续性仍待确认。",
    trend: "新启动",
    heat: 69,
    changePercent: 2.18,
    upCount: 19,
    downCount: 12,
    flatCount: 6,
    limitUpCount: 2,
    limitUp30Count: 15,
    continuationDays: 1,
    turnover: "156.8 亿",
    rankTimes: 3,
    leader: { code: "300750.SZ", name: "宁德时代", price: 232.46, changePercent: 2.41, amount: "41.2 亿", status: "龙头", rank: 1 },
    members: [
      { code: "300750.SZ", name: "宁德时代", price: 232.46, changePercent: 2.41, amount: "41.2 亿", status: "龙头", rank: 1 },
      { code: "688778.SH", name: "厦钨新能", price: 52.16, changePercent: 5.84, amount: "7.2 亿", status: "强势", rank: 2 },
      { code: "688116.SH", name: "天奈科技", price: 25.74, changePercent: 3.28, amount: "5.6 亿", status: "观察", rank: 3 },
      { code: "002074.SZ", name: "国轩高科", price: 21.09, changePercent: 1.72, amount: "9.4 亿", status: "观察", rank: 4 }
    ],
    history: history([
      ["08-26", 0.25, 0, 48], ["08-27", -0.34, 0, 46], ["08-28", 1.42, 1, 55], ["08-29", 0.74, 1, 58], ["08-31", 1.93, 2, 65], ["09-01", 2.18, 2, 69]
    ]),
    events: [
      { id: "battery-1", date: "09-01", time: "09:42", type: "新事件", title: "材料端出现新技术路线讨论", summary: "相关材料和设备公司活跃度提升，暂以观察为主。", tone: "neutral" }
    ],
    relations: [{ id: "semiconductor", name: "半导体设备", kind: "关联" }, { id: "robotics", name: "人形机器人", kind: "关联" }]
  },
  {
    id: "innovative-medicine",
    name: "创新药",
    category: "医药生物",
    description: "创新药研发、商业化和海外授权相关的医药题材，基本面驱动和事件驱动并存。",
    trend: "退潮",
    heat: 58,
    changePercent: -0.76,
    upCount: 13,
    downCount: 24,
    flatCount: 7,
    limitUpCount: 1,
    limitUp30Count: 11,
    continuationDays: 0,
    turnover: "128.4 亿",
    rankTimes: 2,
    leader: { code: "603259.SH", name: "药明康德", price: 58.7, changePercent: 1.14, amount: "20.6 亿", status: "龙头", rank: 1 },
    members: [
      { code: "603259.SH", name: "药明康德", price: 58.7, changePercent: 1.14, amount: "20.6 亿", status: "龙头", rank: 1 },
      { code: "000963.SZ", name: "华东医药", price: 34.52, changePercent: 0.28, amount: "8.5 亿", status: "强势", rank: 2 },
      { code: "600276.SH", name: "恒瑞医药", price: 48.16, changePercent: -0.82, amount: "15.1 亿", status: "观察", rank: 3 },
      { code: "688506.SH", name: "百利天恒", price: 192.4, changePercent: -2.13, amount: "7.4 亿", status: "观察", rank: 4 }
    ],
    history: history([
      ["08-26", 2.04, 2, 64], ["08-27", 1.12, 1, 62], ["08-28", -0.45, 1, 60], ["08-29", -1.32, 0, 55], ["08-31", -0.28, 1, 57], ["09-01", -0.76, 1, 58]
    ]),
    events: [
      { id: "medicine-1", date: "08-31", time: "15:02", type: "公告", title: "部分高位品种进入兑现观察期", summary: "事件催化减弱后，板块内部的基本面分化重新成为主线。", tone: "negative" }
    ],
    relations: [{ id: "ai-compute", name: "AI 算力", kind: "关联" }]
  }
];

export function getTopic(topicId: string) {
  return topicUniverse.find((topic) => topic.id === topicId);
}

export function getTopicOverview() {
  return {
    activeCount: topicUniverse.filter((topic) => topic.heat >= 70).length,
    mainlineCount: topicUniverse.filter((topic) => topic.trend === "强化").length,
    newCount: topicUniverse.filter((topic) => topic.trend === "新启动").length,
    limitUpCount: topicUniverse.reduce((total, topic) => total + topic.limitUpCount, 0),
    averageChange: topicUniverse.reduce((total, topic) => total + topic.changePercent, 0) / topicUniverse.length
  };
}

export function getTopicEvents() {
  return topicUniverse
    .flatMap((topic) => topic.events.map((event) => ({ ...event, topicId: topic.id, topicName: topic.name })))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
