import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { MAX_FILE_BYTES, ParquetViewError, transformBytes, transform } from './utils'
import { meta } from './meta'
import type { ParquetViewInput, ParquetViewOptions } from './schema'

/** 文件入口：File → 字节只在组件里做 */
async function readFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ParquetViewError('文件超过 30 MiB 上限')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  return transformBytes(bytes)
}

export default function Tool() {
  const t = useTranslate()
  return (
    <TwoColumn<ParquetViewInput, ParquetViewOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      idleText="Parquet 是二进制格式，请点「上传文件」选择 .parquet，页脚元数据将在本地解析"
      example={{
        text: '请使用「上传文件」选择一个 .parquet 文件（例如由 Spark / Pandas / pyarrow 生成）',
      }}
      fileInput={{ label: t('tool.file'), accept: '.parquet', onFile: readFile }}
    />
  )
}
