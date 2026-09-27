import { z } from 'zod'

/** 输入契约：text=税前月薪（元） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：socialRate=社保个人比例%，fundRate=公积金个人比例%（均为下拉字符串值） */
export const optionsSchema = z.object({
  socialRate: z.string(),
  fundRate: z.string(),
})

export type SalaryInput = z.infer<typeof inputSchema>
export type SalaryOptions = z.infer<typeof optionsSchema>
