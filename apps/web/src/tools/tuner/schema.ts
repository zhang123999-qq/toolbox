import { z } from 'zod'

/** 输入契约：调音器走麦克风入口；左侧文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：调音器暂无可调选项，保留空对象以统一结构 */
export const optionsSchema = z.object({})

export type TunerInput = z.infer<typeof inputSchema>
export type TunerOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 对应（空） */
export type TunerFormOptions = Record<string, never>
