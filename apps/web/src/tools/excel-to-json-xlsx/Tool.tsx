import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { MAX_FILE_BYTES, ExcelToJsonError, fileToJson, transform } from './utils'
import type { ExcelToJsonInput, ExcelToJsonOptions } from './schema'

const EXAMPLE: ExcelToJsonInput = {
  text: 'id,name,active,score\n1,工具库,true,870.5\n2,表格,false,',
}

/** 文件入口：File → 字节只在组件里做；.xlsx / .csv 都支持 */
async function readFile(file: File, options: ExcelToJsonOptions): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExcelToJsonError('文件超过 20 MiB 上限，请用命令行工具处理')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  return fileToJson(bytes, file.name, options)
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<ExcelToJsonOptions>[] = [
    { key: 'withHeader', label: t('option.withHeader'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<ExcelToJsonInput, ExcelToJsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ withHeader: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file'), accept: '.xlsx,.csv,.tsv,.txt', onFile: readFile }}
    />
  )
}
