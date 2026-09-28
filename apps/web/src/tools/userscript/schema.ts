import { z } from 'zod'

/** 主输入：油猴脚本元信息 JSON */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type UserscriptToolInput = z.infer<typeof inputSchema>
