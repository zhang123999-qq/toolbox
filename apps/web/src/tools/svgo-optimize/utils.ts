import type { SvgoOptimizeInput, SvgoOptimizeOptions } from './schema'

const MAX_INPUT = 200_000

/** 去掉 XML 声明与注释 */
function stripCommentsAndDecl(code: string): string {
  return code.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '')
}

/** 缩短数字精度：1.000 → 1，1.500 → 1.5，0.5 → .5（可选，这里保留前导 0 可读性更好） */
function shortenNumbers(code: string): string {
  // 只处理属性里的小数：把 1.23456 截到最多 2 位小数，并去掉多余的 0
  return code.replace(/-?\d+\.\d+/g, (num) => {
    const rounded = (Math.round(Number(num) * 100) / 100).toString()
    return rounded
  })
}

/** 去掉默认属性：fill="black" stroke="none" stroke-width="1" 等（仅当值为默认值时） */
function removeDefaultAttrs(code: string): string {
  return code
    .replace(/\s+fill="(black|#000000|rgb\(0,0,0\))"/gi, '')
    .replace(/\s+stroke="none"/gi, '')
    .replace(/\s+stroke-width="1"/gi, '')
    .replace(/\s+fill-opacity="1"/gi, '')
    .replace(/\s+opacity="1"/gi, '')
    .replace(/\s+version="1\.[0-9]"/gi, '')
}

/** 压缩标签间空白 */
function collapseWhitespace(code: string): string {
  return code.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
}

/** 校验是否为 SVG */
function assertSvg(code: string): void {
  if (!/<svg[\s>]/i.test(code)) {
    throw new Error('输入不是合法的 SVG：缺少 <svg> 根标签')
  }
}

export function optimizeSvg(code: string): string {
  assertSvg(code)
  let out = stripCommentsAndDecl(code)
  out = removeDefaultAttrs(out)
  out = shortenNumbers(out)
  out = collapseWhitespace(out)
  return out
}

export function transform(input: SvgoOptimizeInput, _options: SvgoOptimizeOptions): string {
  void _options
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  const optimized = optimizeSvg(input.text)
  const ratio =
    input.text.length === 0 ? 0 : Math.round((optimized.length / input.text.length) * 100)
  const saved = 100 - ratio
  return [
    optimized,
    '',
    `<!-- 原始 ${input.text.length} 字符 → 优化后 ${optimized.length} 字符（节省 ${saved}%） -->`,
  ].join('\n')
}
