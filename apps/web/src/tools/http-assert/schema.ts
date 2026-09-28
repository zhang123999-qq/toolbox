import { z } from 'zod'

/** 主输入：请求 URL */
export const inputSchema = z.object({
  text: z.string().max(2000, 'URL 超过 2000 字符上限'),
})

/** 附加输入：请求头 / 请求体 / 断言规则 JSON */
export const extraSchema = z.object({
  headers: z.string().max(200000, '请求头超过 200000 字符上限'),
  body: z.string().max(200000, '请求体超过 200000 字符上限'),
  assertions: z.string().max(200000, '断言规则超过 200000 字符上限'),
})

export type HttpAssertInput = z.infer<typeof inputSchema>
export type HttpAssertExtra = z.infer<typeof extraSchema>

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]
