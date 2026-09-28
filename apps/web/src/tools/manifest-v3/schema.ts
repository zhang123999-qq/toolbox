import { z } from 'zod'

/** 主输入：Manifest V3 配置 JSON */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type ManifestV3Input = z.infer<typeof inputSchema>
