import { z } from 'zod'

/**
 * 输入契约（#628 Favicon 多尺寸生成）
 * - 文件经 <input type="file"> 由 Tool.tsx 直接处理，不走文本 schema；
 *   此处保留最小契约以满足 catalog 校验。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  sizes: z.string().max(100, '尺寸配置过长'),
})

export type FaviconGenInput = z.infer<typeof inputSchema>
export type FaviconGenOptions = z.infer<typeof optionsSchema>
