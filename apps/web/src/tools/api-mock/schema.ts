import { z } from 'zod'

/** 主输入：模拟请求行，如 `GET /users/123?active=true` */
export const inputSchema = z.object({
  text: z.string().max(2000, '请求行超过 2000 字符上限'),
})

/** 附加输入：路由规则 JSON、请求体 JSON */
export const extraSchema = z.object({
  routes: z.string().max(200000, '路由规则超过 200000 字符上限'),
  body: z.string().max(200000, '请求体超过 200000 字符上限'),
})

export type ApiMockInput = z.infer<typeof inputSchema>
export type ApiMockExtra = z.infer<typeof extraSchema>
