import { z } from 'zod'

/**
 * 选项契约：userPassword=打开密码（必填）；ownerPassword=所有者密码（选填，空=与用户密码相同）；
 * keyLength=密钥长度；allowPrint/allowExtract/allowModify/allowAnnotate=四项权限开关。
 * 密码只做长度上限校验，不在 schema 里判空（空密码的语义错误由 utils.validatePassword 抛出）。
 */
export const optionsSchema = z.object({
  userPassword: z.string().max(128),
  ownerPassword: z.string().max(128),
  keyLength: z.enum(['256', '128']),
  allowPrint: z.boolean(),
  allowExtract: z.boolean(),
  allowModify: z.boolean(),
  allowAnnotate: z.boolean(),
})

export type PdfEncryptOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/是否已加密） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
