import { z } from 'zod'

/** 重命名规则：prefix 加前缀 / number 序号 / replace 查找替换 */
export const ruleSchema = z.enum(['prefix', 'number', 'replace'])

export const optionsSchema = z.object({
  rule: ruleSchema,
  prefix: z.string().max(100, '前缀不能超过 100 个字符'),
  find: z.string().max(200, '查找内容不能超过 200 个字符'),
  replace: z.string().max(200, '替换内容不能超过 200 个字符'),
  start: z.number().int().min(0).max(999999),
  digits: z.number().int().min(1).max(6),
})

export type BatchRenameRule = z.infer<typeof ruleSchema>
export type BatchRenameOptions = z.infer<typeof optionsSchema>
