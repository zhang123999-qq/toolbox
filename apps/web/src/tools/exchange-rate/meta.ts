import type { ToolMeta } from '@toolbox/catalog'

/**
 * exchange-rate —— 全局编号 #364
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：D｜模板：T2
 *
 * D 类工具写法照抄 #48 translate：feasibility='D'、api=true、inputs 含 apiKey、
 * API Key 只能由用户在页面输入框填写（type=password），不硬编码、不入库。
 * 数据流向：浏览器直调汇率接口，不经本项目任何服务器（ToolShell 自动展示提示条）。
 * 来源：docs/tools/06-数学金融.md
 */
export const meta: ToolMeta = {
  id: 'exchange-rate',
  slug: 'exchange-rate',
  title: '汇率换算',
  description: '输入金额并填写自备的 API Key，实时查询汇率并换算（Key 仅保存在本页）',
  titleEn: 'Exchange Rate Converter',
  descriptionEn:
    'Convert amounts with live exchange rates using your own API key (kept on this page only)',

  category: 'math',
  group: 'life',
  tags: ['exchange-rate', 'currency', 'finance'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text', 'apiKey'],
  outputs: ['text'],
  options: ['from', 'to'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
