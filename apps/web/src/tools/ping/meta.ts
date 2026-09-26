import type { ToolMeta } from '@toolbox/catalog'

/**
 * ping —— 全局编号 #254
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P3｜可行性：C｜模板：T2
 * 来源：docs/tools/03-开发运维云原生.md
 *
 * 说明：规划为 E 级（浏览器无法发送原生 ICMP Echo Request）。ICMP 套接字在浏览器里
 * 不可用，故降级为「命令生成器」：按平台拼出 ping / tcping 命令并解释参数；另可选
 * 用 fetch(no-cors) + Performance API 做一次「HTTP 层可达性」弱检测，明确告知这不是
 * ICMP ping。绝不伪称真的 ping 通了。
 */
export const meta: ToolMeta = {
  id: 'ping',
  slug: 'ping',
  title: 'Ping 测试',
  description: '生成跨平台 ping / tcping 命令并解释参数；附 HTTP 可达性弱检测（非 ICMP）',
  titleEn: 'Ping Command Generator',
  descriptionEn:
    'Generate cross-platform ping / tcping commands with param explanations; optional HTTP reachability check (not ICMP)',

  category: 'devops',
  group: 'dev',
  tags: ['ping', 'icmp', 'network', 'tcping', 'devops'],

  priority: 'P3',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'interval', 'packetSize', 'platform', 'httpCheck'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
