import { z } from 'zod'

/** 输入契约：text=矩阵 A，textB=矩阵 B（加/减/乘时用） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：运算类型 */
export const optionsSchema = z.object({
  operation: z.union([
    z.literal('add'),
    z.literal('subtract'),
    z.literal('multiply'),
    z.literal('determinant'),
    z.literal('inverse'),
    z.literal('transpose'),
  ]),
})

export type MatrixInput = z.infer<typeof inputSchema>
export type MatrixOptions = z.infer<typeof optionsSchema>

export const OPERATION_LABELS: Record<MatrixOptions['operation'], string> = {
  add: '加法（A + B）',
  subtract: '减法（A − B）',
  multiply: '乘法（A × B）',
  determinant: '行列式（det A）',
  inverse: '逆矩阵（A⁻¹）',
  transpose: '转置（Aᵀ）',
}
