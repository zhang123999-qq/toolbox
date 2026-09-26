import type { ToolMeta } from '@toolbox/catalog'

/**
 * sqlite-viewer —— 全局编号 #184
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * 说明：规划为 B 级（sql.js / wasm 在浏览器执行 SQL）。wasm 依赖未安装且零新增网络依赖。
 * 自行实现完整 SQLite 引擎不现实，故落地为「纯 TS 读数据库头 + 首页 sqlite_master」：
 * 解析 b-tree 叶子页与 record 编码，列出表 / 视图 / 索引及其 CREATE 语句。
 * 不执行 SQL、不读取业务表数据（见 README）。文件入口上传 .db / .sqlite / .sqlite3。
 */
export const meta: ToolMeta = {
  id: 'sqlite-viewer',
  slug: 'sqlite-viewer',
  title: 'SQLite 查看器',
  description: '上传 .sqlite 数据库文件，离线查看文件头信息与表 / 视图 / 索引清单（sqlite_master）',
  titleEn: 'SQLite Viewer (Metadata)',
  descriptionEn: 'Inspect a SQLite database file offline: header info and tables/views/indexes',

  category: 'data-format',
  group: 'dev',
  tags: ['sqlite', 'database', 'schema', 'db', 'file'],

  priority: 'P2',
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
