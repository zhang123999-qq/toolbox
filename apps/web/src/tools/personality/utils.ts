/**
 * personality（#838）工具函数：MBTI 四维度简化问卷计分。
 * 纯函数，无 DOM / 网络依赖。娱乐参考，非专业心理测评。
 */

export type Dim = 'EI' | 'SN' | 'TF' | 'JP'
export type Answer = 'a' | 'b'

export interface Question {
  readonly id: string
  readonly dim: Dim
  readonly text: string
  readonly optionA: string
  readonly optionB: string
  /** 选项 A 对应的人格字母 */
  readonly poleA: string
  /** 选项 B 对应的人格字母 */
  readonly poleB: string
}

export const QUESTIONS: readonly Question[] = [
  {
    id: 'q1',
    dim: 'EI',
    text: '在聚会上你通常会？',
    optionA: '主动和陌生人攀谈',
    optionB: '和熟人待在一起',
    poleA: 'E',
    poleB: 'I',
  },
  {
    id: 'q2',
    dim: 'EI',
    text: '休息日你更喜欢？',
    optionA: '约朋友出门玩',
    optionB: '一个人安静待着',
    poleA: 'E',
    poleB: 'I',
  },
  {
    id: 'q3',
    dim: 'EI',
    text: '想到新点子时你会？',
    optionA: '马上说出来和大家讨论',
    optionB: '先自己想清楚再说',
    poleA: 'E',
    poleB: 'I',
  },
  {
    id: 'q4',
    dim: 'EI',
    text: '在团队讨论中你更倾向于？',
    optionA: '积极发言、主导话题',
    optionB: '认真倾听、适时补充',
    poleA: 'E',
    poleB: 'I',
  },
  {
    id: 'q5',
    dim: 'SN',
    text: '做事时你更依赖？',
    optionA: '过往经验和事实',
    optionB: '直觉和灵感',
    poleA: 'S',
    poleB: 'N',
  },
  {
    id: 'q6',
    dim: 'SN',
    text: '你更关注？',
    optionA: '当下的具体细节',
    optionB: '未来的各种可能',
    poleA: 'S',
    poleB: 'N',
  },
  {
    id: 'q7',
    dim: 'SN',
    text: '学习新东西时你习惯？',
    optionA: '一步步按部就班',
    optionB: '先抓住整体框架',
    poleA: 'S',
    poleB: 'N',
  },
  {
    id: 'q8',
    dim: 'SN',
    text: '你更信任？',
    optionA: '亲眼所见的数据',
    optionB: '对规律和趋势的推测',
    poleA: 'S',
    poleB: 'N',
  },
  {
    id: 'q9',
    dim: 'TF',
    text: '做重要决定时你更看重？',
    optionA: '逻辑与公平',
    optionB: '感受与和谐',
    poleA: 'T',
    poleB: 'F',
  },
  {
    id: 'q10',
    dim: 'TF',
    text: '需要指出朋友的问题时你会？',
    optionA: '直说问题本身',
    optionB: '先照顾对方情绪',
    poleA: 'T',
    poleB: 'F',
  },
  {
    id: 'q11',
    dim: 'TF',
    text: '你更欣赏哪种品质？',
    optionA: '公正客观',
    optionB: '体贴善良',
    poleA: 'T',
    poleB: 'F',
  },
  {
    id: 'q12',
    dim: 'TF',
    text: '发生冲突时你倾向于？',
    optionA: '就事论事讲道理',
    optionB: '先安抚大家情绪',
    poleA: 'T',
    poleB: 'F',
  },
  {
    id: 'q13',
    dim: 'JP',
    text: '出行前你通常会？',
    optionA: '做好详细计划',
    optionB: '随性而定、边走边看',
    poleA: 'J',
    poleB: 'P',
  },
  {
    id: 'q14',
    dim: 'JP',
    text: '面对截止日期你会？',
    optionA: '提前完成、留有余地',
    optionB: '最后一刻集中冲刺',
    poleA: 'J',
    poleB: 'P',
  },
  {
    id: 'q15',
    dim: 'JP',
    text: '你的桌面通常是？',
    optionA: '整齐有序',
    optionB: '随手放但找得到',
    poleA: 'J',
    poleB: 'P',
  },
  {
    id: 'q16',
    dim: 'JP',
    text: '你更喜欢？',
    optionA: '确定的安排',
    optionB: '开放的选项',
    poleA: 'J',
    poleB: 'P',
  },
]

export interface PersonalityResult {
  /** 如 ENFP */
  readonly type: string
  readonly dims: Record<Dim, string>
  readonly scores: Record<string, number>
}

/**
 * 计分：每题按选项累加对应人格字母，得分高者（平分取前者）组成四字母类型。
 * 未答完抛中文错误。
 */
export function scoreAnswers(answers: Record<string, Answer>): PersonalityResult {
  const missing = QUESTIONS.length - Object.keys(answers).length
  if (missing > 0) throw new Error(`还有 ${missing} 道题未作答`)
  const scores: Record<string, number> = {}
  for (const q of QUESTIONS) {
    const a = answers[q.id]
    if (a !== 'a' && a !== 'b') throw new Error(`第 ${q.id} 题答案无效`)
    const pole = a === 'a' ? q.poleA : q.poleB
    scores[pole] = (scores[pole] ?? 0) + 1
  }
  const pick = (x: string, y: string): string => ((scores[x] ?? 0) >= (scores[y] ?? 0) ? x : y)
  const dims: Record<Dim, string> = {
    EI: pick('E', 'I'),
    SN: pick('S', 'N'),
    TF: pick('T', 'F'),
    JP: pick('J', 'P'),
  }
  return { type: dims.EI + dims.SN + dims.TF + dims.JP, dims, scores }
}

export interface TypeDescription {
  readonly name: string
  readonly desc: string
}

export const TYPE_DESCRIPTIONS: Record<string, TypeDescription> = {
  INTJ: { name: '建筑师', desc: '独立、有战略眼光，喜欢用逻辑规划长远目标。' },
  INTP: { name: '逻辑学家', desc: '好奇、爱思考，沉迷于拆解复杂问题。' },
  ENTJ: { name: '指挥官', desc: '果断、有领导力，天生的组织者与决策者。' },
  ENTP: { name: '辩论家', desc: '机智、爱探索，享受智力上的交锋与新点子。' },
  INFJ: { name: '提倡者', desc: '温柔而坚定，追求意义与深层连接。' },
  INFP: { name: '调停者', desc: '理想主义、重感情，忠于内心的价值观。' },
  ENFJ: { name: '主人公', desc: '热情、有感染力，乐于帮助他人成长。' },
  ENFP: { name: '竞选者', desc: '自由、充满活力，对世界永远好奇。' },
  ISTJ: { name: '物流师', desc: '可靠、讲原则，注重事实与秩序。' },
  ISFJ: { name: '守卫者', desc: '细心、体贴，默默守护身边的人。' },
  ESTJ: { name: '总经理', desc: '务实、高效，擅长管理和执行。' },
  ESFJ: { name: '执政官', desc: '热心、周到，重视和谐与归属感。' },
  ISTP: { name: '鉴赏家', desc: '冷静、动手能力强，喜欢拆解与实操。' },
  ISFP: { name: '探险家', desc: '随和、有审美，活在当下的体验派。' },
  ESTP: { name: '企业家', desc: '果敢、行动派，享受刺激与挑战。' },
  ESFP: { name: '表演者', desc: '开朗、爱热闹，走到哪里都是气氛担当。' },
}

/** 查类型解读；未知类型抛中文错误 */
export function describeType(type: string): TypeDescription {
  const d = TYPE_DESCRIPTIONS[type]
  if (!d) throw new Error(`未知的人格类型：${type}`)
  return d
}

/** 结果格式化为可读文本 */
export function formatResult(r: PersonalityResult): string {
  const d = describeType(r.type)
  return `你的人格类型是 ${r.type}（${d.name}）\n${d.desc}\n维度：外向-内向 ${r.dims.EI}｜实感-直觉 ${r.dims.SN}｜思考-情感 ${r.dims.TF}｜判断-感知 ${r.dims.JP}`
}
