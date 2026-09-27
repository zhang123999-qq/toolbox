import { z } from 'zod'

/** 输入契约：text=参数（key=value 每行一个，或按顺序的裸数字） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：图形 */
export const optionsSchema = z.object({
  shape: z.union([
    z.literal('square'),
    z.literal('rectangle'),
    z.literal('triangle'),
    z.literal('circle'),
    z.literal('cube'),
    z.literal('sphere'),
    z.literal('cylinder'),
    z.literal('cone'),
  ]),
})

export type GeometryInput = z.infer<typeof inputSchema>
export type GeometryOptions = z.infer<typeof optionsSchema>

export const SHAPE_LABELS: Record<GeometryOptions['shape'], string> = {
  square: '正方形',
  rectangle: '矩形',
  triangle: '三角形',
  circle: '圆',
  cube: '立方体',
  sphere: '球体',
  cylinder: '圆柱体',
  cone: '圆锥体',
}
