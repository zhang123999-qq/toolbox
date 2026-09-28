import { z } from 'zod'

/**
 * 选项契约：schemes=启用的方案 id 列表，或 id→是否启用的 record；
 * 由 utils.parseEnabledSchemes 解析并校验（至少保留 1 组，未知 id 过滤）。
 */
export const optionsSchema = z.object({
  schemes: z.union([z.array(z.string().max(32)), z.record(z.string(), z.boolean())]).optional(),
})

export type CompressCompareOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
