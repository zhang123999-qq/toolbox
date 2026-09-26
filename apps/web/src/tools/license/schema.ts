import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  licenseType: z.union([
    z.literal('MIT'),
    z.literal('Apache-2.0'),
    z.literal('GPL-3.0'),
    z.literal('BSD-3-Clause'),
    z.literal('ISC'),
    z.literal('Unlicense'),
  ]),
  author: z.string().min(1, '作者不能为空').max(120, '作者名过长'),
  year: z.string().regex(/^\d{4}$/, '年份应为 4 位数字'),
})

export type LicenseInput = z.infer<typeof inputSchema>
export type LicenseOptions = z.infer<typeof optionsSchema>
