import { z } from 'zod'
import { MAX_BEATS_PER_BAR, MAX_BPM, MIN_BPM, VALID_BEAT_UNITS } from './utils'

/** 输入契约：节拍器不需要文本输入，左侧文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：BPM / 每小节拍数 / 拍号分母。
 * 组件里是文本框字符串，这里用 coerce 转成数字并给出中文报错。
 */
export const optionsSchema = z.object({
  bpm: z.coerce
    .number({ error: 'BPM 必须是数字' })
    .min(MIN_BPM, { error: `BPM 不能小于 ${MIN_BPM}` })
    .max(MAX_BPM, { error: `BPM 不能大于 ${MAX_BPM}` }),
  beatsPerBar: z.coerce
    .number({ error: '每小节拍数必须是数字' })
    .int({ error: '每小节拍数必须是整数' })
    .min(1, { error: '每小节拍数至少为 1' })
    .max(MAX_BEATS_PER_BAR, { error: `每小节拍数不能超过 ${MAX_BEATS_PER_BAR}` }),
  beatUnit: z.coerce
    .number({ error: '拍号分母必须是数字' })
    .refine((v) => (VALID_BEAT_UNITS as readonly number[]).includes(v), {
      error: `拍号分母须为 ${VALID_BEAT_UNITS.join(' / ')} 之一`,
    }),
})

export type MetronomeInput = z.infer<typeof inputSchema>
export type MetronomeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，启动时经 optionsSchema 校验并转成数字 */
export interface MetronomeFormOptions {
  bpm: string
  beatsPerBar: string
  beatUnit: string
}
