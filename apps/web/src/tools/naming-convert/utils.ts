import type { NamingConvertInput, NamingConvertOptions } from './schema'

/**
 * 切成小写单词序列：
 *  1. 小写/数字后紧跟大写时插入分隔（userID → user ID）
 *  2. 连续大写后跟「大写+小写」时插入分隔（HTTPServer → HTTP Server）
 *  3. 再按空白、下划线、中划线、点号切开
 */
export function tokenize(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-./]+/)
    .filter((token) => token !== '')
    .map((token) => token.toLowerCase())
}

/** 首字母大写（只处理首字符，中文原样返回） */
function upperFirst(word: string): string {
  return word === '' ? '' : word.charAt(0).toUpperCase() + word.slice(1)
}

export function convert(text: string, mode: string): string {
  const tokens = tokenize(text)
  if (tokens.length === 0) return ''

  switch (mode) {
    case 'pascal':
      return tokens.map(upperFirst).join('')
    case 'snake':
      return tokens.join('_')
    case 'kebab':
      return tokens.join('-')
    case 'constant':
      return tokens.join('_').toUpperCase()
    case 'camel':
    default:
      return tokens.map((token, index) => (index === 0 ? token : upperFirst(token))).join('')
  }
}

/** 逐行转换：空行跳过，便于一次处理一批标识符 */
export function transform(input: NamingConvertInput, options: NamingConvertOptions): string {
  if (input.text.trim() === '') return ''
  return input.text
    .split(/\r\n|\r|\n/)
    .map((line) => (line.trim() === '' ? '' : convert(line, options.mode)))
    .join('\n')
}
