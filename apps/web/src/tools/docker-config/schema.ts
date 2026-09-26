import { z } from 'zod'

export const BASE_IMAGES = ['node', 'python', 'golang', 'openjdk'] as const

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  baseImage: z.enum(BASE_IMAGES),
  version: z.string(),
  workdir: z.string(),
  port: z.string(),
  command: z.string(),
})

export type DockerConfigInput = z.infer<typeof inputSchema>
export type DockerConfigOptions = z.infer<typeof optionsSchema>
