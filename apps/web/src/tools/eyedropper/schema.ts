import { z } from 'zod'

/** 输入契约：手动输入的颜色走文本区；图片走文件入口 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：图片取色时的采样半径（像素），0 表示只取单点 */
export const optionsSchema = z.object({
  radius: z.coerce
    .number({ error: '采样半径必须是数字' })
    .int({ error: '采样半径必须是整数' })
    .min(0, { error: '采样半径不能为负数' })
    .max(50, { error: '采样半径不能超过 50 像素' }),
})

export type EyedropperInput = z.infer<typeof inputSchema>
export type EyedropperOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface EyedropperFormOptions {
  radius: string
}
