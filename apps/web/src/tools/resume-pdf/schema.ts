import { z } from 'zod'

/**
 * 输入契约：简历全部字段都在 extraInputs 里，text 只做占位（模板要求输入对象有 text）。
 * 长度上限在 schema 层守住，内容语义校验在 utils 里给出中文错误。
 */
export const inputSchema = z.object({
  text: z.string().max(1000, '输入超过 1000 字符上限'),
  name: z.string().max(100, '姓名超过 100 字符上限'),
  title: z.string().max(200, '求职意向超过 200 字符上限'),
  email: z.string().max(200, '邮箱超过 200 字符上限'),
  phone: z.string().max(100, '电话超过 100 字符上限'),
  location: z.string().max(200, '城市超过 200 字符上限'),
  summary: z.string().max(2000, '个人简介超过 2000 字符上限'),
  experience: z.string().max(10000, '工作经历超过 10000 字符上限'),
  education: z.string().max(5000, '教育背景超过 5000 字符上限'),
  skills: z.string().max(2000, '技能超过 2000 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type ResumeInput = z.infer<typeof inputSchema>
export type ResumeOptions = z.infer<typeof optionsSchema>
