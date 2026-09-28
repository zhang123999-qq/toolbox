import { z } from 'zod'
import { MAX_EXPORT_DIM } from './utils'

/** 输入契约：视频文件走组件内文件选择器 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：抓帧时间点（秒，允许小数） */
export const optionsSchema = z.object({
  time: z.coerce.number({ error: '时间必须是数字' }).min(0, { error: '时间不能为负数' }),
})

/** 导出最大边长（供 schema 引用） */
export const EXPORT_DIM_LIMIT = MAX_EXPORT_DIM

export type VideoFrameInput = z.infer<typeof inputSchema>
export type VideoFrameFormOptions = z.infer<typeof optionsSchema>
