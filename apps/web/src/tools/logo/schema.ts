import { z } from 'zod'

/**
 * 输入契约（#385 Logo 生成）
 * - text：品牌名，留空使用示例品牌名
 * - 选项 style：minimal / gradient / geometric / badge，默认 minimal
 * - 选项 primaryColor / secondaryColor：主 / 辅色（CSS 颜色），留空随机
 * - 选项 iconShape：circle / square / none，默认 circle
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  style: z.string().max(20, '样式过长'),
  primaryColor: z.string().max(40, '主色过长'),
  secondaryColor: z.string().max(40, '辅色过长'),
  iconShape: z.string().max(20, '图标形状过长'),
})

export type LogoInput = z.infer<typeof inputSchema>
export type LogoOptions = z.infer<typeof optionsSchema>
