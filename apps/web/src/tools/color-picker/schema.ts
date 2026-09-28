import { z } from 'zod'

/**
 * 选项契约：manualHex=用户手动输入的色值（#rgb / #rrggbb，可选）。
 * 实际校验由 utils.parseHexInput 完成，这里只做长度上限。
 */
export const optionsSchema = z.object({
  manualHex: z.string().max(20).optional(),
})

export type ColorPickerOptions = z.infer<typeof optionsSchema>
