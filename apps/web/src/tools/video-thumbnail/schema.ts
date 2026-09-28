import { z } from 'zod'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：时间点文本（逗号/空格/换行分隔）与网格列数。
 * 组件里是文本框字符串；时间点的数值合法性由 utils 校验并给出中文报错，
 * 列数在这里先做整数转换，范围（1～6）由 utils 的 gridDims 把关。
 */
export const optionsSchema = z.object({
  timestamps: z.string().min(1, { error: '请输入至少一个时间点' }),
  columns: z.coerce.number({ error: '列数必须是数字' }),
})

export type VideoThumbnailInput = z.infer<typeof inputSchema>
export type VideoThumbnailOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验 */
export interface VideoThumbnailFormOptions {
  timestamps: string
  columns: string
}
