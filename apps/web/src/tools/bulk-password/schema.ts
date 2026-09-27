import { z } from 'zod'

/** 输入契约：输入框只作触发用（点「示例」填入固定占位符即生成），内容不参与生成 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：count=生成条数（上限 10000）；length=单条长度；
 * lower/upper/numbers/symbols=启用的字符集。合法性由 utils 校验并给出双语报错。
 */
export const optionsSchema = z.object({
  count: z.string().max(10, '数量过长'),
  length: z.string().max(10, '长度取值过长'),
  includeLower: z.boolean(),
  includeUpper: z.boolean(),
  includeNumbers: z.boolean(),
  includeSymbols: z.boolean(),
})

export type BulkPasswordInput = z.infer<typeof inputSchema>
export type BulkPasswordOptions = z.infer<typeof optionsSchema>
