import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import {
  MAX_FILE_BYTES,
  ExcelToCsvError,
  rowsFromFileBytes,
  rowsToDelimited,
  transform,
} from './utils'
import type { ExcelToCsvInput, ExcelToCsvOptions } from './schema'

const EXAMPLE: ExcelToCsvInput = { text: 'name\ttools\tlocal\n工具库\t870\ttrue' }

/** 文件入口：.xlsx 走最小二进制解析，其余当文本表格；File → 字节只在组件里做 */
async function readFile(file: File, options: ExcelToCsvOptions): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExcelToCsvError('文件超过 20 MiB 上限，请用命令行工具处理')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const rows = await rowsFromFileBytes(bytes, file.name, options)
  if (rows.length === 0) return ''
  return rowsToDelimited(rows, options.format === 'tsv' ? '\t' : ',')
}

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<ExcelToCsvOptions>[] = [
    {
      key: 'delimiter',
      label: t('option.delimiter'),
      kind: 'select',
      values: ['auto', 'comma', 'tab', 'semicolon', 'pipe'],
    },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['csv', 'tsv'] },
  ]

  return (
    <TwoColumn<ExcelToCsvInput, ExcelToCsvOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ delimiter: 'auto', format: 'csv' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file'), accept: '.xlsx,.csv,.tsv,.txt', onFile: readFile }}
    />
  )
}
