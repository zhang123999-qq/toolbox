import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

export const optionsSchema = z.object({
  version: z.string().min(1, '版本号不能为空').max(64, '版本号过长'),
})

export type ChangelogInput = z.infer<typeof inputSchema>
export type ChangelogOptions = z.infer<typeof optionsSchema>
