import { z } from 'zod'

/** 选项契约：multipass=多轮优化（默认 on）；pretty=格式化输出（默认 off） */
export const optionsSchema = z.object({
  multipass: z.enum(['on', 'off']),
  pretty: z.enum(['on', 'off']),
})

export type SvgOptimizeImgOptions = z.infer<typeof optionsSchema>
