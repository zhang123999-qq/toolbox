import { z } from 'zod'

/** 选项契约：groupSize=每组张数 2–10；direction=拼接方向；gap=间距 0–100px；
 *  bgColor=背景色 #rrggbb；align=对齐（横向时垂直对齐/纵向时水平对齐）；
 *  format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效） */
export const optionsSchema = z.object({
  groupSize: z.string().max(10, '组大小取值过长'),
  direction: z.enum(['horizontal', 'vertical']),
  gap: z.string().max(10, '间距取值过长'),
  bgColor: z.string().max(20, '背景色取值过长'),
  align: z.enum(['center', 'start']),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type MergeBatchOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/总数） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
