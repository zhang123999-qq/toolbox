import { z } from 'zod'

/** 主输入：参数文本（每行 key=value） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type WranglerInput = z.infer<typeof inputSchema>

/** 选项：当前选中的命令 */
export const optionsSchema = z.object({
  action: z.string(),
})

export type WranglerOptions = z.infer<typeof optionsSchema>
