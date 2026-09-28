import { z } from 'zod'

/** 主输入：生成模式下可留空（用表单规则），解析模式下为待解析的规则 JSON */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type EdgeRedirectInput = z.infer<typeof inputSchema>

/** 选项：mode=generate 生成；mode=parse 解析；表单一次编辑一条规则 */
export const optionsSchema = z.object({
  mode: z.enum(['generate', 'parse']),
  from: z.string(),
  to: z.string(),
  status: z.enum(['301', '302', '307', '308']),
})

export type EdgeRedirectOptions = z.infer<typeof optionsSchema>
