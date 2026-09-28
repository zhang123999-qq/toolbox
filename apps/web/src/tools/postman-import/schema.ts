import { z } from 'zod'

/** 主输入：Postman Collection v2.1 JSON */
export const inputSchema = z.object({
  text: z.string().max(500000, 'Collection 内容超过 500000 字符上限'),
})

export type PostmanImportInput = z.infer<typeof inputSchema>
