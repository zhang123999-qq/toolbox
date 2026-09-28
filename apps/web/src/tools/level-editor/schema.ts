import { z } from 'zod'

/** 主输入：关卡对象 JSON 数组（各字段见 README） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type LevelEditorToolInput = z.infer<typeof inputSchema>
