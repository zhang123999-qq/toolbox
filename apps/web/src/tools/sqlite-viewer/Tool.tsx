import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { MAX_FILE_BYTES, SqliteViewerError, transformBytes, transform } from './utils'
import { meta } from './meta'
import type { SqliteViewerInput, SqliteViewerOptions } from './schema'

/** 文件入口：File → 字节只在组件里做 */
async function readFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new SqliteViewerError('文件超过 30 MiB 上限')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  return transformBytes(bytes)
}

export default function Tool() {
  const t = useTranslate()
  return (
    <TwoColumn<SqliteViewerInput, SqliteViewerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      idleText="请点「上传文件」选择 .db / .sqlite / .sqlite3 数据库，表结构将在本地解析"
      example={{ text: '请使用「上传文件」选择一个 SQLite 数据库文件（.db / .sqlite / .sqlite3）' }}
      fileInput={{
        label: t('tool.file'),
        accept: '.db,.sqlite,.sqlite3,.sqlite2',
        onFile: readFile,
      }}
    />
  )
}
