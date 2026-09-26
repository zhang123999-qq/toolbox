import { z } from 'zod'

export const KINDS = [
  'Deployment',
  'Service',
  'ConfigMap',
  'Ingress',
  'PersistentVolumeClaim',
] as const

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  kind: z.enum(KINDS),
  name: z.string(),
  image: z.string(),
  port: z.string(),
  replicas: z.string(),
})

export type K8sConfigInput = z.infer<typeof inputSchema>
export type K8sConfigOptions = z.infer<typeof optionsSchema>
