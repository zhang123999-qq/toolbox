import { z } from 'zod'

/**
 * 选项契约（均为字符串，由滑杆/下拉框产生，组件内经 utils 解析校验）：
 * page=目标页码（1 起）；x/y=签名左上角在页面可移动范围内的百分比 0–100；
 * scale=缩放百分比 10–300；lineWidth=画布笔触宽度 1–20。
 */
export const optionsSchema = z.object({
  page: z.string().max(10, '页码取值过长'),
  x: z.string().max(10, '横坐标取值过长'),
  y: z.string().max(10, '纵坐标取值过长'),
  scale: z.string().max(10, '缩放取值过长'),
  lineWidth: z.string().max(10, '线宽取值过长'),
})

export type PdfSignOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
