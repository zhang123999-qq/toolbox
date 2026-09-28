import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { workbookFileToMarkdown } from './utils'
import type { ExcelToMarkdownInput, ExcelToMarkdownOptions } from './schema'

export default function Tool() {
  const optionDefs: readonly OptionDef<ExcelToMarkdownOptions>[] = [
    {
      key: 'sheet',
      label: '工作表',
      kind: 'text',
      placeholder: '留空 = 全部工作表',
    },
  ]

  return (
    <TwoColumn<ExcelToMarkdownInput, ExcelToMarkdownOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ sheet: '' }}
      runAsync={async () => {
        throw new Error('请使用左下「选择文件」上传 Excel 文件，文本框输入无法转换')
      }}
      idleText="点左下「选择文件」上传 Excel 文件，转换为 Markdown 表格"
      optionDefs={optionDefs}
      fileInput={{
        label: 'Excel 文件（.xlsx / .xls / .csv，全程本地处理，不上传）',
        accept: '.xlsx,.xls,.csv',
        onFile: workbookFileToMarkdown,
      }}
    />
  )
}
