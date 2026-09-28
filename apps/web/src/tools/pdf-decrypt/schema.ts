import { z } from 'zod'

/**
 * 选项契约：password=PDF 打开密码。
 * 密码由组件 state 持有（仅内存），不进表单持久化、不上传；
 * 解密完成后组件会立即清空。
 */
export const optionsSchema = z.object({
  password: z.string().max(256, '密码过长'),
})

export type PdfDecryptOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
