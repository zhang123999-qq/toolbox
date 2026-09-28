import { z } from 'zod'

/** 输入契约：应用名称 name（取 text 字段，必填） */
export const inputSchema = z.object({
  text: z.string().max(500, '应用名称超过 500 字符上限'),
})

/** 选项契约：其余 manifest 字段 */
export const optionsSchema = z.object({
  shortName: z.string().max(500, '短名称超过 500 字符上限'),
  startUrl: z.string().max(2000, '启动地址过长'),
  display: z.string().max(50, 'display 过长'),
  themeColor: z.string().max(20, '主题色过长'),
  backgroundColor: z.string().max(20, '背景色过长'),
  icons: z.string().max(10000, '图标文本过长'),
})

export type ManifestInput = z.infer<typeof inputSchema>
export type ManifestOptions = z.infer<typeof optionsSchema>
