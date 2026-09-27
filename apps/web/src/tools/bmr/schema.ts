import { z } from 'zod'

/** 输入契约：text=身高（cm），textB=体重（kg） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：gender=性别（男/女），age=年龄，formula=公式 */
export const optionsSchema = z.object({
  gender: z.string(),
  age: z.string(),
  formula: z.string(),
})

export type BmrInput = z.infer<typeof inputSchema>
export type BmrOptions = z.infer<typeof optionsSchema>
