import { z } from 'zod'

/**
 * 选项契约：
 * position=页码位置（6 档）；style=页码样式（n / nOfN / page）；
 * startNumber=起始编号（文本输入，空=1）；fromPage=从第几页开始（文本输入，空=1）；
 * fontSize=字号 pt（文本输入，空=12）；margin=边距 pt（文本输入，空=36）。
 * 文本输入的范围校验由 utils 的 parse* 函数负责（抛中文直述错误）。
 */
export const optionsSchema = z.object({
  position: z.enum([
    'topLeft',
    'topCenter',
    'topRight',
    'bottomLeft',
    'bottomCenter',
    'bottomRight',
  ]),
  style: z.enum(['n', 'nOfN', 'page']),
  startNumber: z.string().max(10, '起始编号取值过长'),
  fromPage: z.string().max(10, '起始页取值过长'),
  fontSize: z.string().max(10, '字号取值过长'),
  margin: z.string().max(10, '边距取值过长'),
})

export type PdfPageNumberOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
