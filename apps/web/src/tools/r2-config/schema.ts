import { z } from 'zod'

/** 主输入：存储桶名称 */
export const inputSchema = z.object({
  text: z.string().max(63, '输入超过 63 字符上限'),
  /** 绑定名 */
  binding: z.string().max(100, '输入超过 100 字符上限'),
  /** 预览存储桶名称（可选） */
  previewBucketName: z.string().max(63, '输入超过 63 字符上限'),
})

export type R2ConfigInput = z.infer<typeof inputSchema>
