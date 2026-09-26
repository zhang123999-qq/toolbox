import type { CodeConvertInput, CodeConvertOptions } from './schema'

/** JS → Python：基础逐行映射 */
function jsToPy(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      let l = line
      // function name(args) {  →  def name(args):
      l = l.replace(/^(\s*)function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{\s*$/, '$1def $2($3):')
      // console.log(x) → print(x)
      l = l.replace(/console\.log\s*\(/g, 'print(')
      // let/const/var x = → x =
      l = l.replace(/^(\s*)(?:let|const|var)\s+([A-Za-z0-9_$]+)\s*=/g, '$1$2 =')
      // if (cond) { → if cond:
      l = l.replace(/^(\s*)if\s*\((.*)\)\s*\{\s*$/, '$1if $2:')
      // else { → else:
      l = l.replace(/^(\s*)else\s*\{\s*$/, '$1else:')
      // for (let i = 0; i < n; i++) {  →  for i in range(n):
      l = l.replace(
        /^(\s*)for\s*\(\s*(?:let|var)\s+([A-Za-z0-9_$]+)\s*=\s*\d+\s*;\s*([A-Za-z0-9_$]+)\s*<\s*([A-Za-z0-9_$]+)\s*;.*\)\s*\{\s*$/,
        '$1for $2 in range($4):',
      )
      // true/false/undefined
      l = l
        .replace(/\btrue\b/g, 'True')
        .replace(/\bfalse\b/g, 'False')
        .replace(/\bundefined\b/g, 'None')
      // 去掉孤立的右花括号（粗略）
      l = l.replace(/^\s*\}\s*$/, '')
      return l
    })
    .join('\n')
}

/** Python → JS：基础逐行映射 */
function pyToJs(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      let l = line
      // def name(args): → function name(args) {
      l = l.replace(/^(\s*)def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*:\s*$/, '$1function $2($3) {')
      // print(x) → console.log(x)
      l = l.replace(/\bprint\s*\(/g, 'console.log(')
      // if cond: → if (cond) {
      l = l.replace(/^(\s*)if\s+(.*):\s*$/, '$1if ($2) {')
      // else: → else {
      l = l.replace(/^(\s*)else\s*:\s*$/, '$1else {')
      // for x in range(n): → for (let i = 0; i < n; i++) {
      l = l.replace(
        /^(\s*)for\s+([A-Za-z0-9_]+)\s+in\s+range\(([^)]*)\)\s*:\s*$/,
        '$1for (let i = 0; i < $3; i++) {',
      )
      // True/False/None
      l = l
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'undefined')
      return l
    })
    .join('\n')
}

export function convert(source: string, from: string, to: string): string {
  if (from === to) return source
  if (from === 'javascript' && to === 'python') return jsToPy(source)
  if (from === 'python' && to === 'javascript') return pyToJs(source)
  throw new Error('不支持的转换方向：' + from + ' → ' + to)
}

export function transform(input: CodeConvertInput, options: CodeConvertOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 50000) throw new Error('输入超过 50,000 字符上限')
  return convert(input.text, options.from, options.to)
}
