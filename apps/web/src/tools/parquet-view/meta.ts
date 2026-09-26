import type { ToolMeta } from '@toolbox/catalog'

/**
 * parquet-view —— 全局编号 #177
 * 域：data-format（数据格式）｜大组：dev｜优先级：P3｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * 说明：规划为 B 级（parquet-wasm 在浏览器读列数据）。wasm 依赖未安装且零新增网络依赖，
 * 自行实现 Snappy/Zstd 解压与列式解码不现实，故落地为「纯 TS 解析 Parquet 页脚元数据」：
 * 读尾部 PAR1 + Thrift Compact 编码的 FileMetaData，给出版本 / 行数 / schema / row group 概况。
 * 不读取列数据值（见 README）。文件入口上传 .parquet。
 */
export const meta: ToolMeta = {
  id: 'parquet-view',
  slug: 'parquet-view',
  title: 'Parquet 查看',
  description: '上传 .parquet 文件，离线查看页脚元数据：版本、行数、字段 schema 与 row group',
  titleEn: 'Parquet Metadata Viewer',
  descriptionEn: 'Inspect Parquet footer metadata offline: version, rows, schema and row groups',

  category: 'data-format',
  group: 'dev',
  tags: ['parquet', 'metadata', 'columnar', 'bigdata', 'file'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
