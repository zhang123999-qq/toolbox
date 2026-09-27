import { z } from 'zod'

/** 输入契约：text=方程文本（一元方程单行，方程组两行） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：方程类型 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('linear'), z.literal('quadratic'), z.literal('system')]),
})

export type EquationInput = z.infer<typeof inputSchema>
export type EquationOptions = z.infer<typeof optionsSchema>

export const MODE_LABELS: Record<EquationOptions['mode'], string> = {
  linear: '一元一次方程（ax + b = 0）',
  quadratic: '一元二次方程（ax² + bx + c = 0）',
  system: '二元一次方程组（两行）',
}
