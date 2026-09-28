import { z } from 'zod'

/** 输入契约：视频与字幕走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：字幕样式。组件里是文本框 / 下拉框字符串，
 * 这里用 coerce / 枚举转成类型并给出中文报错。
 */
export const optionsSchema = z.object({
  fontSize: z.coerce
    .number({ error: '字号必须是数字' })
    .int({ error: '字号必须是整数' })
    .min(8, {
      error: '字号不能小于 8',
    })
    .max(96, { error: '字号不能大于 96' }),
  fontColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: '字体颜色应为 #RRGGBB 格式（如 #FFFFFF）' }),
  position: z.enum(['top', 'middle', 'bottom'], { error: '字幕位置只能是 top / middle / bottom' }),
})

export type SubtitleBurnInput = z.infer<typeof inputSchema>
export type SubtitleBurnOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface SubtitleBurnFormOptions {
  fontSize: string
  fontColor: string
  position: 'top' | 'middle' | 'bottom'
}
