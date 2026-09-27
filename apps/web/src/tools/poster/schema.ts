import { z } from 'zod'

/** 各字段字符上限 */
export const TITLE_MAX = 80
export const SUBTITLE_MAX = 120
export const BODY_MAX = 2000
export const FOOTER_MAX = 100
export const THEME_MAX = 20

/**
 * 输入契约
 * - text：海报正文（主输入，多行，对应模板的 data-testid="input"）
 * - title / subtitle / footer：标题 / 副标题 / 落款（附加字段）
 */
export const inputSchema = z.object({
  text: z.string().max(BODY_MAX, '正文超过 2000 字符上限'),
  title: z.string().max(TITLE_MAX, '标题超过 80 字符上限'),
  subtitle: z.string().max(SUBTITLE_MAX, '副标题超过 120 字符上限'),
  footer: z.string().max(FOOTER_MAX, '落款超过 100 字符上限'),
})

/** 选项契约：主题（下拉选项，值为翻译后的展示文本，合法性由主题白名单校验） */
export const optionsSchema = z.object({
  theme: z.string().max(THEME_MAX, '主题超过 20 字符上限'),
})

export type PosterInput = z.infer<typeof inputSchema>
export type PosterOptions = z.infer<typeof optionsSchema>
