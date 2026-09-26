import type { ReadmeInput, ReadmeOptions } from './schema'

/** 把功能列表文本拆成 bullet 数组（按行，去空行） */
export function parseFeatures(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-*]\s*/, ''))
    .filter(Boolean)
}

export function buildReadme(options: ReadmeOptions, featuresText: string): string {
  const features = parseFeatures(featuresText)
  const lines: string[] = []
  lines.push(`# ${options.projectName}`)
  lines.push('')
  if (options.description.trim() !== '') {
    lines.push(options.description.trim())
    lines.push('')
  }
  lines.push('## 功能特性')
  lines.push('')
  if (features.length > 0) {
    for (const f of features) lines.push(`- ${f}`)
  } else {
    lines.push('- （待补充）')
  }
  lines.push('')
  lines.push('## 安装')
  lines.push('')
  lines.push('```bash')
  lines.push(`npm install ${options.projectName}`)
  lines.push('```')
  lines.push('')
  lines.push('## 使用')
  lines.push('')
  lines.push('```js')
  lines.push(`import { example } from '${options.projectName}'`)
  lines.push('')
  lines.push(`example()`)
  lines.push('```')
  lines.push('')
  lines.push('## 许可证')
  lines.push('')
  lines.push(`本项目基于 ${options.license} 许可证发布，详见 [LICENSE](./LICENSE)。`)
  return lines.join('\n')
}

export function transform(input: ReadmeInput, options: ReadmeOptions): string {
  if (options.projectName.trim() === '' && input.text.trim() === '') return ''
  if (input.text.length > 20000) throw new Error('输入超过 20,000 字符上限')
  return buildReadme(options, input.text)
}
