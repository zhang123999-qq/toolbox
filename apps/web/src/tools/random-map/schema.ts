import { z } from 'zod'

/** 主输入：{ w, h, seed, waterLevel?, mountainRate? } JSON */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type RandomMapToolInput = z.infer<typeof inputSchema>
