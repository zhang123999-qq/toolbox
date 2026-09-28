import { z } from 'zod'

/** 主输入：缓存信息 JSON（cacheControl / etag / expires / age） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type ApiCacheInput = z.infer<typeof inputSchema>
