import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

export const optionsSchema = z.object({
  projectName: z.string().min(1, '项目名不能为空').max(64, '项目名过长'),
  description: z.string().max(200, '描述过长'),
  license: z.union([
    z.literal('MIT'),
    z.literal('Apache-2.0'),
    z.literal('GPL-3.0'),
    z.literal('Unlicense'),
  ]),
})

export type ReadmeInput = z.infer<typeof inputSchema>
export type ReadmeOptions = z.infer<typeof optionsSchema>
