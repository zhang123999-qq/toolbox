import { z } from 'zod'

export const PROVIDERS = ['aws', 'azure', 'google'] as const
export const RESOURCES = ['compute', 'storage', 'network'] as const

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  provider: z.enum(PROVIDERS),
  resource: z.enum(RESOURCES),
})

export type TerraformConfigInput = z.infer<typeof inputSchema>
export type TerraformConfigOptions = z.infer<typeof optionsSchema>
