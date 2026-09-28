/**
 * tarot（#840）工具函数：塔罗牌阵抽取与解读。
 * 纯函数，无 DOM / 网络依赖。娱乐占卜，非预测工具。
 */

export interface Arcana {
  readonly id: string
  readonly name: string
  readonly nameEn: string
  readonly upright: string
  readonly reversed: string
}

/** 22 张大阿卡纳 */
export const MAJOR_ARCANA: readonly Arcana[] = [
  {
    id: 'fool',
    name: '愚者',
    nameEn: 'The Fool',
    upright: '新的开始、冒险、天真烂漫',
    reversed: '鲁莽、停滞不前、错失机会',
  },
  {
    id: 'magician',
    name: '魔术师',
    nameEn: 'The Magician',
    upright: '创造力、行动力、资源齐备',
    reversed: '优柔寡断、才华被埋没',
  },
  {
    id: 'priestess',
    name: '女祭司',
    nameEn: 'The High Priestess',
    upright: '直觉、内在智慧、静待时机',
    reversed: '忽视直觉、表象迷惑',
  },
  {
    id: 'empress',
    name: '女皇',
    nameEn: 'The Empress',
    upright: '丰盛、母性、创造力绽放',
    reversed: '依赖、创造力受阻',
  },
  {
    id: 'emperor',
    name: '皇帝',
    nameEn: 'The Emperor',
    upright: '权威、结构、稳定掌控',
    reversed: '专制、僵化、失控',
  },
  {
    id: 'hierophant',
    name: '教皇',
    nameEn: 'The Hierophant',
    upright: '传统、指导、精神信仰',
    reversed: '教条、盲从、束缚',
  },
  {
    id: 'lovers',
    name: '恋人',
    nameEn: 'The Lovers',
    upright: '真爱、结合、重要抉择',
    reversed: '关系失衡、错误选择',
  },
  {
    id: 'chariot',
    name: '战车',
    nameEn: 'The Chariot',
    upright: '意志、胜利、勇往直前',
    reversed: '方向迷失、操之过急',
  },
  {
    id: 'strength',
    name: '力量',
    nameEn: 'Strength',
    upright: '勇气、耐心、以柔克刚',
    reversed: '自我怀疑、情绪失控',
  },
  {
    id: 'hermit',
    name: '隐者',
    nameEn: 'The Hermit',
    upright: '内省、寻求指引、独处沉淀',
    reversed: '孤立、迷失方向',
  },
  {
    id: 'wheel',
    name: '命运之轮',
    nameEn: 'Wheel of Fortune',
    upright: '转机、好运、否极泰来',
    reversed: '厄运、抗拒改变',
  },
  {
    id: 'justice',
    name: '正义',
    nameEn: 'Justice',
    upright: '公平、真相、因果分明',
    reversed: '不公、偏颇、逃避责任',
  },
  {
    id: 'hanged',
    name: '倒吊人',
    nameEn: 'The Hanged Man',
    upright: '换位思考、牺牲小我、等待',
    reversed: '无谓牺牲、拖延',
  },
  {
    id: 'death',
    name: '死神',
    nameEn: 'Death',
    upright: '结束与新生、蜕变',
    reversed: '抗拒改变、停滞',
  },
  {
    id: 'temperance',
    name: '节制',
    nameEn: 'Temperance',
    upright: '平衡、节制、稳步调和',
    reversed: '失衡、极端',
  },
  {
    id: 'devil',
    name: '恶魔',
    nameEn: 'The Devil',
    upright: '欲望、执念、被束缚',
    reversed: '摆脱束缚、重获自由',
  },
  {
    id: 'tower',
    name: '高塔',
    nameEn: 'The Tower',
    upright: '剧变、旧结构崩塌',
    reversed: '灾难延迟、勉强维持',
  },
  {
    id: 'star',
    name: '星星',
    nameEn: 'The Star',
    upright: '希望、灵感、疗愈',
    reversed: '失望、信心受挫',
  },
  {
    id: 'moon',
    name: '月亮',
    nameEn: 'The Moon',
    upright: '不安、幻象、潜意识',
    reversed: '拨云见日、走出迷雾',
  },
  {
    id: 'sun',
    name: '太阳',
    nameEn: 'The Sun',
    upright: '喜悦、成功、光明磊落',
    reversed: '短暂阴霾、过度乐观',
  },
  {
    id: 'judgement',
    name: '审判',
    nameEn: 'Judgement',
    upright: '觉醒、召唤、重生',
    reversed: '自我批判、错过召唤',
  },
  {
    id: 'world',
    name: '世界',
    nameEn: 'The World',
    upright: '圆满、完成、新的循环',
    reversed: '未竟之业、画地为牢',
  },
]

export interface SpreadDef {
  readonly id: string
  readonly name: string
  readonly positions: readonly string[]
}

export const SPREADS: readonly SpreadDef[] = [
  { id: 'single', name: '单张牌', positions: ['指引'] },
  { id: 'three', name: '三张牌', positions: ['过去', '现在', '未来'] },
  { id: 'cross', name: '十字牌阵', positions: ['现状', '挑战', '过去', '未来', '建议'] },
]

/** 可注入的随机数，便于单测确定性 */
export type Rng = () => number

export interface DrawnCard {
  readonly card: Arcana
  readonly reversed: boolean
  readonly position: string
}

/** 按 id 取牌阵；未知 id 抛中文错误 */
export function getSpread(id: string): SpreadDef {
  const s = SPREADS.find((x) => x.id === id)
  if (!s) throw new Error(`未知的牌阵：${id}`)
  return s
}

/**
 * 抽取 count 张不重复的牌并判定正逆位。
 * rng 返回 [0,1)；返回 1 时视为牌堆耗尽保护分支（测试可覆盖）。
 */
export function drawCards(
  count: number,
  rng: Rng = Math.random,
): { card: Arcana; reversed: boolean }[] {
  if (!Number.isInteger(count) || count <= 0 || count > MAJOR_ARCANA.length) {
    throw new Error(`抽牌数量必须在 1 到 ${MAJOR_ARCANA.length} 之间`)
  }
  const pool = [...MAJOR_ARCANA]
  const out: { card: Arcana; reversed: boolean }[] = []
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(rng() * pool.length)
    const card = pool[idx]
    if (card === undefined) throw new Error('抽牌失败：牌堆为空')
    pool.splice(idx, 1)
    out.push({ card, reversed: rng() < 0.5 })
  }
  return out
}

/** 按牌阵抽取，牌位与牌一一对应 */
export function drawSpread(spreadId: string, rng: Rng = Math.random): DrawnCard[] {
  const spread = getSpread(spreadId)
  return drawCards(spread.positions.length, rng).map((d, i) => ({
    ...d,
    position: spread.positions[i] as string,
  }))
}

/** 单张抽牌结果格式化为可读文本 */
export function formatDrawn(d: DrawnCard): string {
  const dir = d.reversed ? '逆位' : '正位'
  const meaning = d.reversed ? d.card.reversed : d.card.upright
  return `${d.card.name}（${d.card.nameEn}）${dir}：${meaning}`
}
