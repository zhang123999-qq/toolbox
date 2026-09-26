import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  serviceName: z.string(),
  image: z.string(),
  ports: z.string(),
  environment: z.string(),
  volumes: z.string(),
  dependsOn: z.string(),
})

export type DockerComposeInput = z.infer<typeof inputSchema>
export type DockerComposeOptions = z.infer<typeof optionsSchema>
