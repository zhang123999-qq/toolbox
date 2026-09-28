import { z } from 'zod'

/** 选项契约：removeMetadata=是否清除文档元数据（标题/作者/创建者/生产者/主题/关键字） */
export const optionsSchema = z.object({
  removeMetadata: z.boolean(),
})

export type PdfCompressOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（魔数/大小/加密） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
