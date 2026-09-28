import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { assertDocxFile, assertNonEmptyHtml, exactBuffer, stripImageTags } from './utils'
import type { WordToHtmlInput, WordToHtmlOptions } from './schema'

/**
 * mammoth 走动态导入：重型库只在用户真正选文件时加载，不进首屏包。
 * mammoth 官方只发布 browser 打包（mammoth.browser.js），没有该子路径的类型声明，
 * 受「每个工具恰好 8 个文件、不得外新增 d.ts」的约束，在此处就地抑制该导入的类型报错
 * （file-hash 的 spark-md5 亦用同一手法）。browser 构建在浏览器与 vitest(jsdom) 下
 * 均以 { arrayBuffer } 为输入。
 */
async function loadMammoth() {
  // @ts-expect-error mammoth browser 构建无类型声明（子路径导入）
  return import('mammoth/mammoth.browser')
}

/**
 * 文件入口编排：校验 → 读字节 → mammoth 转 HTML → 去图片（按模式）→ 非空校验。
 * mammoth 只转出内容片段（标题 / 段落 / 加粗 / 列表 / 表格 / 链接），不含 <html> 外壳。
 */
async function convertDocxFile(file: File, options: WordToHtmlOptions): Promise<string> {
  assertDocxFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length === 0) throw new Error('文件为空，请选择有效的 .docx 文件')
  const mammoth = await loadMammoth()
  let html: string
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: exactBuffer(bytes) },
      options.imageMode === 'embed' ? { convertImage: mammoth.images.dataUri } : {},
    )
    html = String(result.value)
  } catch {
    throw new Error('文档解析失败：文件可能已损坏或不是有效的 .docx 文件')
  }
  const cleaned = options.imageMode === 'embed' ? html : stripImageTags(html)
  assertNonEmptyHtml(cleaned)
  return cleaned
}

export default function Tool() {
  const optionDefs: readonly OptionDef<WordToHtmlOptions>[] = [
    {
      key: 'imageMode',
      label: '图片处理（ignore=去掉图片，embed=转为 data URI 嵌入）',
      kind: 'select',
      values: ['ignore', 'embed'],
    },
  ]

  return (
    <TwoColumn<WordToHtmlInput, WordToHtmlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ imageMode: 'ignore' }}
      runAsync={async () => {
        throw new Error('请使用左下「选择文件」上传 .docx 文件，文本框输入无法转换')
      }}
      idleText="点左下「选择文件」上传 .docx 文档，转换为 HTML"
      optionDefs={optionDefs}
      fileInput={{
        label: 'Word 文档（.docx，全程本地处理，不上传）',
        accept: '.docx',
        onFile: convertDocxFile,
      }}
    />
  )
}
