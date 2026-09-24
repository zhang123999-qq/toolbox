import { z } from 'zod'
import { CATEGORY_IDS, FEASIBILITIES, GROUP_IDS, PRIORITIES, TEMPLATE_IDS } from './types'
import type { Feasibility, ToolMeta } from './types'
import { groupOfCategory } from './categories'

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * 工具元数据 Schema（16 字段全必填）
 * 校验规则对应 DEVELOPMENT.md §6.2 的 10 条
 */
export const toolMetaSchema = z
  .object({
    id: z.string().regex(KEBAB, 'id 必须为 kebab-case'),
    slug: z.string().regex(KEBAB, 'slug 必须为 kebab-case'),
    title: z.string().min(1),
    description: z.string().min(1),

    // 可选英文文案：不计入 16 个必需字段，缺省时 UI 回落中文
    titleEn: z.string().min(1).optional(),
    descriptionEn: z.string().min(1).optional(),

    category: z.enum(CATEGORY_IDS),
    group: z.enum(GROUP_IDS),
    tags: z
      .array(z.string().regex(/^[a-z0-9-]+$/))
      .min(2)
      .max(5),

    priority: z.enum(PRIORITIES),
    feasibility: z.enum(FEASIBILITIES),
    template: z.enum(TEMPLATE_IDS),

    inputs: z.array(z.string()),
    outputs: z.array(z.string()),
    options: z.array(z.string()),

    deps: z.array(z.string()),
    worker: z.boolean(),
    wasm: z.boolean(),
    api: z.boolean(),
  })
  .superRefine((meta, ctx) => {
    // 规则 2：slug 必须与 id 一致
    if (meta.slug !== meta.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `slug(${meta.slug}) 必须等于 id(${meta.id})`,
      })
    }
    // 规则 4：group 必须与 category 的归属一致
    const expectedGroup = groupOfCategory(meta.category)
    if (meta.group !== expectedGroup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `group 应为 "${expectedGroup}"（域 ${meta.category} 的归属），实际为 "${meta.group}"`,
      })
    }
    // 规则 9：worker/wasm/api 与 feasibility 一致
    for (const message of checkFeasibilityFlags(meta)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message })
    }
  })

/** 可行性标签 → 执行特征布尔字段的强制映射 */
export function checkFeasibilityFlags(meta: {
  feasibility: Feasibility
  worker: boolean
  wasm: boolean
  api: boolean
}): string[] {
  const errors: string[] = []
  const { feasibility, worker, wasm, api } = meta
  switch (feasibility) {
    case 'A':
      if (worker || wasm || api) errors.push('feasibility=A 时 worker/wasm/api 必须全为 false')
      break
    case 'B':
      if (!wasm) errors.push('feasibility=B 时 wasm 必须为 true')
      if (api) errors.push('feasibility=B 时 api 必须为 false')
      break
    case 'C':
      if (api) errors.push('feasibility=C 时 api 必须为 false')
      break
    case 'D':
    case 'E':
      if (!api) errors.push(`feasibility=${feasibility} 时 api 必须为 true`)
      break
  }
  return errors
}

/** 返回人类可读的错误列表，供 scripts/check-tools.ts 使用 */
export function validateTool(meta: unknown): string[] {
  const result = toolMetaSchema.safeParse(meta)
  if (result.success) return []
  return result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

export function assertTool(meta: unknown): ToolMeta {
  return toolMetaSchema.parse(meta) as ToolMeta
}
