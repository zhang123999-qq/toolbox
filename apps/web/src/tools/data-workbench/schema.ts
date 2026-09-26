import { z } from 'zod'

/** 输入契约：待转换的原始数据 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  steps 每行一个步骤，形如 `upper`、`jsonFormat(4)`、`replace(a,b)`；
 *  mode 决定输出每步的中间结果，还是只给最终结果。
 */
export const optionsSchema = z.object({
  steps: z.string().max(2_000, '流水线步骤超过 2,000 字符上限'),
  mode: z.union([z.literal('steps'), z.literal('final')]),
})

export type WorkbenchInput = z.infer<typeof inputSchema>
export type WorkbenchOptions = z.infer<typeof optionsSchema>
