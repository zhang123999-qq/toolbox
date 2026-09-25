import { z } from 'zod'

/** 输入契约：text 是口令；hash 是 PHC 串，仅校验方向使用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  hash: z.string(),
})

/** 选项契约：迭代次数 / 内存开销 / 并行度，三项共同决定 Argon2 的代价 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('hash'), z.literal('verify')]),
  iterations: z.union([z.literal('1'), z.literal('2'), z.literal('3')]),
  memory: z.union([z.literal('8192'), z.literal('19456'), z.literal('32768')]),
  parallelism: z.union([z.literal('1'), z.literal('2')]),
})

export type Argon2Input = z.infer<typeof inputSchema>
export type Argon2Options = z.infer<typeof optionsSchema>
