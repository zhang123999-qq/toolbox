import { z } from 'zod'

/** 输入契约：文本侧可以是粘贴过来的 hex 转储，也可以是任意文本 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定是从十六进制文本还原，还是直接查看这段文本自身的字节；
 *  columns 每行显示几个字节 —— 「列」复用了通用的选项文案。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('view'), z.literal('fromHex')]),
  columns: z.union([z.literal('8'), z.literal('16'), z.literal('32')]),
})

export type BinaryViewerInput = z.infer<typeof inputSchema>
export type BinaryViewerOptions = z.infer<typeof optionsSchema>
