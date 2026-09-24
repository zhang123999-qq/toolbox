/**
 * 工具库元数据类型定义（规范层唯一真源）
 * 口径来源：docs/spec/06-网页结构与信息架构.md §2、docs/spec/09-执行编排提示词.md §8
 */

// ---------------------------------------------------------------------------
// 4 大组
// ---------------------------------------------------------------------------

export const GROUP_IDS = ['dev', 'design', 'office', 'life'] as const
export type GroupId = (typeof GROUP_IDS)[number]

// ---------------------------------------------------------------------------
// 20 个域
// ---------------------------------------------------------------------------

export const CATEGORY_IDS = [
  'text',
  'encoding',
  'data-format',
  'devops',
  'datetime',
  'math',
  'random',
  'image',
  'pdf',
  'media',
  'ai',
  'seo',
  'visualization',
  'web3',
  'a11y',
  'automation',
  'extension',
  'game',
  'edge',
  'education',
] as const
export type CategoryId = (typeof CATEGORY_IDS)[number]

// ---------------------------------------------------------------------------
// 枚举
// ---------------------------------------------------------------------------

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const
export type Priority = (typeof PRIORITIES)[number]

export const FEASIBILITIES = ['A', 'B', 'C', 'D', 'E'] as const
export type Feasibility = (typeof FEASIBILITIES)[number]

export const TEMPLATE_IDS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

// ---------------------------------------------------------------------------
// 域 / 组定义
// ---------------------------------------------------------------------------

export interface CategoryDef {
  /** URL 与 meta.category 使用的英文标识 */
  readonly id: CategoryId
  /** 中文展示名 */
  readonly name: string
  /** 所属大组 */
  readonly group: GroupId
  /** 规划工具总数（docs/catalog/README.md 实测值） */
  readonly plannedTools: number
  /** 全局编号范围 [起, 止]（含端点） */
  readonly range: readonly [number, number]
}

export interface GroupDef {
  readonly id: GroupId
  readonly name: string
  readonly description: string
}

// ---------------------------------------------------------------------------
// 工具元数据（16 字段，全必填）
// ---------------------------------------------------------------------------

export interface ToolMeta {
  // —— 标识 ——
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly description: string

  // —— 英文文案（可选，不计入 16 个必需字段）——
  // 缺省时 UI 回落中文，因此旧工具无需改动即可通过校验；
  // 需要英文站的工具在自己的 meta.ts 里补这两个字段即可。
  readonly titleEn?: string
  readonly descriptionEn?: string

  // —— 归类 ——
  readonly category: CategoryId
  readonly group: GroupId
  readonly tags: readonly string[]

  // —— 排期与可行性 ——
  readonly priority: Priority
  readonly feasibility: Feasibility
  readonly template: TemplateId

  // —— I/O 契约 ——
  readonly inputs: readonly string[]
  readonly outputs: readonly string[]
  readonly options: readonly string[]

  // —— 执行特征 ——
  readonly deps: readonly string[]
  readonly worker: boolean
  readonly wasm: boolean
  readonly api: boolean
}

/** 可行性标签含义，用于 UI 提示文案 */
export const FEASIBILITY_LABEL: Record<Feasibility, string> = {
  A: '纯 JS',
  B: 'WASM',
  C: 'Web API',
  D: '需自备 API/Key',
  E: '需后端',
}
