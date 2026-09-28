import { z } from 'zod'

/** 解码输入文本上限：7000 万字符（防爆内存；Base64 体积约为原图字节的 4/3） */
export const MAX_BASE64_TEXT = 70_000_000

/**
 * 选项契约：
 * mode=模式（encode 图片→Base64 / decode Base64→图片）；
 * dataUrl=编码输出形式（full 完整 DataURL / raw 纯 Base64 去前缀）
 */
export const optionsSchema = z.object({
  mode: z.enum(['encode', 'decode']),
  dataUrl: z.enum(['full', 'raw']),
})

export type ImageBase64Options = z.infer<typeof optionsSchema>

/**
 * 解码输入契约：超长文本直接拒收，避免超大字符串拖垮页面。
 * 组件层对拒收走「提示」分支（见 Tool.tsx handleConvert）。
 */
export const decodeInputSchema = z.object({
  base64Text: z.string().max(MAX_BASE64_TEXT, 'Base64 文本过长（上限 7000 万字符）'),
})
