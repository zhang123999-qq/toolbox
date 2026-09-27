import { z } from 'zod'

/** 各字段字符上限 */
export const NAME_MAX = 40
export const TITLE_MAX = 60
export const COMPANY_MAX = 80
export const PHONE_MAX = 30
export const EMAIL_MAX = 80
export const WEBSITE_MAX = 100

/**
 * 输入契约
 * - text：姓名（主输入，对应模板的 data-testid="input"）
 * - 其余为附加字段
 */
export const inputSchema = z.object({
  text: z.string().max(NAME_MAX, '姓名超过 40 字符上限'),
  title: z.string().max(TITLE_MAX, '职位超过 60 字符上限'),
  company: z.string().max(COMPANY_MAX, '公司超过 80 字符上限'),
  phone: z.string().max(PHONE_MAX, '电话超过 30 字符上限'),
  email: z.string().max(EMAIL_MAX, '邮箱超过 80 字符上限'),
  website: z.string().max(WEBSITE_MAX, '网址超过 100 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type BusinessCardInput = z.infer<typeof inputSchema>
export type BusinessCardOptions = z.infer<typeof optionsSchema>
