import { z } from 'zod'

/**
 * 输入契约
 * - text：金额（元；含税价或不含税价，取决于 taxDirection）
 * - taxRate：税率（%，如 13；0 表示免税）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  taxRate: z.string().max(100, '税率过长'),
})

/** 选项契约：taxDirection=换算方向 */
export const optionsSchema = z.object({
  taxDirection: z.enum(['含税价 → 不含税', '不含税价 → 含税']).default('含税价 → 不含税'),
})

export type TaxInput = z.infer<typeof inputSchema>
export type TaxOptions = z.infer<typeof optionsSchema>
