import { z } from 'zod'

/** 选项契约：outputKind=dataUrl（含 data:image/...;base64, 前缀）/ raw（纯 Base64 无前缀） */
export const optionsSchema = z.object({
  outputKind: z.enum(['dataUrl', 'raw']),
})

export type ImageToBase64Options = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/数量） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
