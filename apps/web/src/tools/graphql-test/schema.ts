import { z } from 'zod'

/** 主输入：GraphQL 端点 URL */
export const inputSchema = z.object({
  text: z.string().max(2000, '端点 URL 超过 2000 字符上限'),
})

/** 附加输入：查询语句 / 变量 JSON / 请求头 */
export const extraSchema = z.object({
  query: z.string().max(200000, '查询语句超过 200000 字符上限'),
  variables: z.string().max(200000, '变量超过 200000 字符上限'),
  headers: z.string().max(200000, '请求头超过 200000 字符上限'),
})

export type GraphqlTestInput = z.infer<typeof inputSchema>
export type GraphqlTestExtra = z.infer<typeof extraSchema>
