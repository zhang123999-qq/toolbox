import { z } from 'zod'

/** 输入契约：CRC 按文本的 UTF-8 字节计算，上限按通用口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：algorithm 选参数组，mode 选输出进制 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('crc32'),
    z.literal('crc32c'),
    z.literal('crc16-modbus'),
    z.literal('crc16-ccitt'),
  ]),
  mode: z.union([z.literal('hex'), z.literal('dec')]),
})

export type CrcInput = z.infer<typeof inputSchema>
export type CrcOptions = z.infer<typeof optionsSchema>
