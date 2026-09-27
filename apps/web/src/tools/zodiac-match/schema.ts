import { z } from 'zod'

/** 输入契约：text=你的名字（可选），textB=对方名字（可选） */
export const inputSchema = z.object({
  text: z.string().max(100, '名字超过 100 字符上限'),
  textB: z.string().max(100, '名字超过 100 字符上限'),
})

/** 选项契约：signA/signB=两个星座的展示名（下拉框取值，utils 内再映射回星座 id） */
export const optionsSchema = z.object({
  signA: z.string(),
  signB: z.string(),
})

export type ZodiacMatchInput = z.infer<typeof inputSchema>
export type ZodiacMatchOptions = z.infer<typeof optionsSchema>
