import { z } from 'zod'

/**
 * 选项契约：tool=标注工具；color=颜色（#rrggbb）；lineWidth=线宽 1–50；
 * fontSize=字号 12–120（文字工具）；text=文字内容（文字工具点击放置）。
 * 数值选项以字符串形态经输入框传递，语义校验在 utils.parse* 中完成。
 */
export const optionsSchema = z.object({
  tool: z.enum(['brush', 'line', 'arrow', 'rect', 'ellipse', 'text', 'mosaic']),
  color: z.string().max(20, '颜色取值过长'),
  lineWidth: z.string().max(10, '线宽取值过长'),
  fontSize: z.string().max(10, '字号取值过长'),
  text: z.string().max(200, '文字过长（最多 200 字）'),
})

export type ImageAnnotateOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
