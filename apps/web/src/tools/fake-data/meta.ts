import type { ToolMeta } from '@toolbox/catalog'

/**
 * fake-data —— 全局编号 #375
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 假数据生成：按字段类型列表批量生成姓名 / 邮箱 / 电话 / 地址 / 身份证 / 公司 / IP / 日期 / 用户名 / UUID
 */
export const meta: ToolMeta = {
  id: 'fake-data',
  slug: 'fake-data',
  title: '假数据生成',
  description:
    '按字段类型列表批量生成测试假数据：姓名 / 邮箱 / 电话 / 地址 / 身份证 / 公司 / IP / 日期 / 用户名 / UUID，支持中英文与 JSON / 行式输出',
  titleEn: 'Fake Data Generator',
  descriptionEn:
    'Generate fake test data from a field-type list: name / email / phone / address / ID card / company / IP / date / username / UUID, in zh/en and JSON or line-delimited output',

  category: 'random',
  group: 'design',
  tags: ['fake', 'mock', 'test-data', 'generator', 'idcard'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'language', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
