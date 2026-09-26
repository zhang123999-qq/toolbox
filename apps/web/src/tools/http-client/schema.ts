import { z } from 'zod'

/** 输入契约：text=URL，headers/body 由 extraInputs 提供 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  headers: z.string().max(200000, '请求头超过 200,000 字符上限'),
  body: z.string().max(200000, '请求体超过 200,000 字符上限'),
})

export const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const

/** 选项契约：方法与 no-cors */
export const optionsSchema = z.object({
  method: z.union([
    z.literal('GET'),
    z.literal('POST'),
    z.literal('PUT'),
    z.literal('DELETE'),
    z.literal('PATCH'),
  ]),
  noCors: z.boolean(),
})

export type HttpClientInput = z.infer<typeof inputSchema>
export type HttpClientOptions = z.infer<typeof optionsSchema>
