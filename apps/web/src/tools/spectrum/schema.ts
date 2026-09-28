import { z } from 'zod'
import { VALID_FFT_SIZES } from './utils'

/** 输入契约：音频走文件/麦克风入口；左侧文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：FFT 点数（决定频率分辨率） */
export const optionsSchema = z.object({
  fftSize: z.coerce
    .number({ error: 'FFT 点数必须是数字' })
    .refine((v) => (VALID_FFT_SIZES as readonly number[]).includes(v), {
      error: `FFT 点数须为 ${VALID_FFT_SIZES.join(' / ')} 之一`,
    }),
})

export type SpectrumInput = z.infer<typeof inputSchema>
export type SpectrumOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值是字符串，分析时经 optionsSchema 校验并转成数字 */
export interface SpectrumFormOptions {
  fftSize: string
}
