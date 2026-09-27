import { z } from 'zod'

/** 各字段字符上限（UI 以 resume.hint 文案说明） */
export const NAME_MAX = 40
export const TITLE_MAX = 60
export const PHONE_MAX = 30
export const EMAIL_MAX = 80
export const SUMMARY_MAX = 500
export const EXPERIENCE_MAX = 3000
export const EDUCATION_MAX = 1000
export const SKILLS_MAX = 500

/**
 * 输入契约
 * - text：姓名（主输入，对应模板的 data-testid="input"）
 * - 其余为附加字段
 */
export const inputSchema = z.object({
  text: z.string().max(NAME_MAX, '姓名超过 40 字符上限'),
  title: z.string().max(TITLE_MAX, '职位超过 60 字符上限'),
  phone: z.string().max(PHONE_MAX, '电话超过 30 字符上限'),
  email: z.string().max(EMAIL_MAX, '邮箱超过 80 字符上限'),
  summary: z.string().max(SUMMARY_MAX, '个人简介超过 500 字符上限'),
  experience: z.string().max(EXPERIENCE_MAX, '工作经历超过 3000 字符上限'),
  education: z.string().max(EDUCATION_MAX, '教育背景超过 1000 字符上限'),
  skills: z.string().max(SKILLS_MAX, '技能超过 500 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type ResumeInput = z.infer<typeof inputSchema>
export type ResumeOptions = z.infer<typeof optionsSchema>
