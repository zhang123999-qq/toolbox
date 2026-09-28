import { z } from 'zod'

/**
 * 选项契约（均为字符串，由组件内 utils 纯函数做数值/格式校验）：
 * direction=拼接方向 horizontal(横向左右拼)/vertical(纵向上下拼)/grid(网格按列数换行)
 * columns=网格列数 1–10（仅 grid 生效）
 * gap=图片间距 px，0–200
 * bgColor=背景色 #rrggbb（Canvas 填充色）
 * align=对齐：横向时取 top/center/bottom（垂直对齐），纵向时取 left/center/right（水平对齐），网格忽略
 * format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效）
 */
export const optionsSchema = z.object({
  direction: z.enum(['horizontal', 'vertical', 'grid']),
  columns: z.string().max(3, '列数取值过长'),
  gap: z.string().max(4, '间距取值过长'),
  bgColor: z.string().max(7, '颜色取值过长'),
  align: z.enum(['top', 'center', 'bottom', 'left', 'right']),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type ImageMergeOptions = z.infer<typeof optionsSchema>

/** 多文件输入不经过 zod 文本校验，由组件内逐张校验（类型/大小） */
export const inputSchema = z.object({
  fileNames: z.array(z.string().max(255)).optional(),
})
