import { z } from 'zod'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：起始秒 / 片段时长（秒）/ 帧率 / 输出宽度（像素） */
export const optionsSchema = z.object({
  start: z.coerce.number({ error: '起始时间必须是数字' }),
  duration: z.coerce.number({ error: '片段时长必须是数字' }),
  fps: z.coerce.number({ error: '帧率必须是数字' }).int({ error: '帧率必须是整数' }),
  width: z.coerce.number({ error: '输出宽度必须是数字' }).int({ error: '输出宽度必须是整数' }),
})

export type VideoToGifInput = z.infer<typeof inputSchema>
export type VideoToGifOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface VideoToGifFormOptions {
  start: string
  duration: string
  fps: string
  width: string
}
