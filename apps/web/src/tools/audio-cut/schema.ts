import { z } from 'zod'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：起止时间（秒）。组件里是文本框字符串，
 * 这里用 coerce 转成数字并给出中文报错。
 */
export const optionsSchema = z.object({
  start: z.coerce.number({ error: '起始时间必须是数字' }).min(0, { error: '起始时间不能为负数' }),
  end: z.coerce.number({ error: '结束时间必须是数字' }).min(0, { error: '结束时间不能为负数' }),
})

export type AudioCutInput = z.infer<typeof inputSchema>
export type AudioCutOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioCutFormOptions {
  start: string
  end: string
}
