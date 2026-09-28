import { z } from 'zod'

/** 输入契约：测速端点 URL */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：测速模式 / 上传数据量（KB） */
export const optionsSchema = z.object({
  mode: z.union([z.literal('download'), z.literal('upload'), z.literal('both')]),
  uploadKb: z.string(),
})

export type SpeedTestNetInput = z.infer<typeof inputSchema>
export type SpeedTestNetOptions = z.infer<typeof optionsSchema>
