import type { CategoryDef, CategoryId, GroupId } from './types'

/**
 * 20 域 ↔ 4 大组 真源表
 *
 * 口径来源 DEVELOPMENT.md §5 / docs/tools/README.md：
 *   dev    = text70 + encoding60 + data-format60 + devops90 + datetime30 + seo50  = 360
 *   design = random50 + image60 + media45 + visualization25 + game20              = 200
 *   office = pdf60                                                                 =  60
 *   life   = math60 + ai30 + web3_25 + a11y25 + automation30
 *            + extension15 + edge15 + education50                                 = 250
 *   合计 870
 */
export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'text', name: '文本与内容处理', group: 'dev', plannedTools: 70, range: [1, 70] },
  { id: 'encoding', name: '编码 / 加密 / 安全', group: 'dev', plannedTools: 60, range: [71, 130] },
  { id: 'data-format', name: '数据格式 / 解析', group: 'dev', plannedTools: 60, range: [131, 190] },
  { id: 'devops', name: '开发 / 运维 / 云原生', group: 'dev', plannedTools: 90, range: [191, 280] },
  { id: 'datetime', name: '时间 / 日期 / 调度', group: 'dev', plannedTools: 30, range: [281, 310] },
  { id: 'math', name: '数学 / 单位 / 金融', group: 'life', plannedTools: 60, range: [311, 370] },
  { id: 'random', name: '随机 / 生成 / 设计', group: 'design', plannedTools: 50, range: [371, 420] },
  { id: 'image', name: '图片 / 图形', group: 'design', plannedTools: 60, range: [421, 480] },
  { id: 'pdf', name: 'PDF / Office / 文档', group: 'office', plannedTools: 60, range: [481, 540] },
  { id: 'media', name: '音视频 / 媒体', group: 'design', plannedTools: 45, range: [541, 585] },
  { id: 'ai', name: 'AI / LLM', group: 'life', plannedTools: 30, range: [586, 615] },
  { id: 'seo', name: '网络 / SEO / 网站', group: 'dev', plannedTools: 50, range: [616, 665] },
  { id: 'visualization', name: '数据可视化', group: 'design', plannedTools: 25, range: [666, 690] },
  { id: 'web3', name: 'Web3 / 区块链', group: 'life', plannedTools: 25, range: [691, 715] },
  { id: 'a11y', name: '无障碍 / 国际化', group: 'life', plannedTools: 25, range: [716, 740] },
  { id: 'automation', name: '自动化 / API / 测试', group: 'life', plannedTools: 30, range: [741, 770] },
  { id: 'extension', name: '浏览器扩展 / 油猴', group: 'life', plannedTools: 15, range: [771, 785] },
  { id: 'game', name: '游戏开发 / 像素', group: 'design', plannedTools: 20, range: [786, 805] },
  { id: 'edge', name: '边缘计算 / Serverless', group: 'life', plannedTools: 15, range: [806, 820] },
  { id: 'education', name: '教育 / 学习 / 趣味', group: 'life', plannedTools: 50, range: [821, 870] },
]

const CATEGORY_MAP: ReadonlyMap<CategoryId, CategoryDef> = new Map(
  CATEGORIES.map((c) => [c.id, c]),
)

export function getCategory(id: CategoryId): CategoryDef {
  const category = CATEGORY_MAP.get(id)
  if (!category) throw new Error(`[catalog] 未知域: ${id}`)
  return category
}

/** 每个大组下的域列表（按定义顺序） */
export function categoriesOfGroup(group: GroupId): readonly CategoryDef[] {
  return CATEGORIES.filter((c) => c.group === group)
}

/** 域 → 大组的唯一推导（meta.group 必须与此一致） */
export function groupOfCategory(id: CategoryId): GroupId {
  return getCategory(id).group
}

/** 规划工具总数，用于进度展示 */
export const PLANNED_TOTAL_TOOLS = CATEGORIES.reduce((sum, c) => sum + c.plannedTools, 0)
