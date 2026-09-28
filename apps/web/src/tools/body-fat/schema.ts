import { z } from 'zod'

/** 输入契约：text=腰围（cm），textB=颈围（cm），textC=身高（cm），textD=臀围（cm，女性必填） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
  textC: z.string().max(200000, '输入超过 200,000 字符上限'),
  textD: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：gender=性别（男/女） */
export const optionsSchema = z.object({
  gender: z.string(),
})

export type BodyFatInput = z.infer<typeof inputSchema>
export type BodyFatOptions = z.infer<typeof optionsSchema>
