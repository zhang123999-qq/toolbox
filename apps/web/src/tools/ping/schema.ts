import { z } from 'zod'

/** 输入契约：目标主机名或 IPv4 地址 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 * - count：发几个包（Windows -n / Linux·macOS -c）
 * - interval：发包间隔秒（Linux·macOS -i；Windows ping 无此参数）
 * - packetSize：包字节数（Windows -l / Linux·macOS -s）
 * - platform：命令目标平台
 * - httpCheck：额外做一次 fetch(no-cors) HTTP 层可达性弱检测（非 ICMP）
 */
export const optionsSchema = z.object({
  count: z.string(),
  interval: z.string(),
  packetSize: z.string(),
  platform: z.union([z.literal('windows'), z.literal('linux'), z.literal('macos')]),
  httpCheck: z.boolean(),
})

export type PingInput = z.infer<typeof inputSchema>
export type PingOptions = z.infer<typeof optionsSchema>
