import { z } from 'zod'

/** 输入框仅作触发（主题信息都在选项里），按通用文本口径限长 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：CSR 主题（Distinguished Name）+ 密钥参数 */
export const optionsSchema = z.object({
  commonName: z.string().min(1, '通用名（CN）不能为空').max(255),
  organization: z.string().max(255),
  organizationalUnit: z.string().max(255),
  country: z
    .string()
    .max(2)
    .refine((value) => value === '' || /^[A-Za-z]{2}$/.test(value), '国家必须为 2 位字母（如 CN）'),
  altNames: z.string().max(2_000),
  keySize: z.union([z.literal('2048'), z.literal('3072'), z.literal('4096')]),
  includePrivateKey: z.boolean(),
})

export type CsrGenerateInput = z.infer<typeof inputSchema>
export type CsrGenerateOptions = z.infer<typeof optionsSchema>
