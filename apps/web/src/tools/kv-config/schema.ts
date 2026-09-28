import { z } from 'zod'

/** 主输入：绑定名（Worker 代码中以 env.<binding> 访问） */
export const inputSchema = z.object({
  text: z.string().max(100, '输入超过 100 字符上限'),
  /** KV 命名空间 ID（32 位十六进制） */
  namespaceId: z.string().max(64, '输入超过 64 字符上限'),
  /** 预览命名空间 ID（可选） */
  previewId: z.string().max(64, '输入超过 64 字符上限'),
})

export type KvConfigInput = z.infer<typeof inputSchema>
