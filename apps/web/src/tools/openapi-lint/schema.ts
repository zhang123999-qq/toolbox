import { z } from 'zod'

/** 主输入：OpenAPI 3.x 规范（JSON 或 YAML） */
export const inputSchema = z.object({
  text: z.string().max(500000, '规范内容超过 500000 字符上限'),
})

export type OpenapiLintInput = z.infer<typeof inputSchema>
