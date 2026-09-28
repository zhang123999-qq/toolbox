import { z } from 'zod'

/** 输入契约：要分享的 URL */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：分享标题与摘要。
 * 键名刻意避开 input 的 `text`，用 `shareTitle` / `shareText` 以免冲突。
 */
export const optionsSchema = z.object({
  shareTitle: z.string().max(200, '分享标题超过 200 字符上限').default(''),
  shareText: z.string().max(500, '分享摘要超过 500 字符上限').default(''),
})

export type SocialShareInput = z.infer<typeof inputSchema>
export type SocialShareOptions = z.infer<typeof optionsSchema>
