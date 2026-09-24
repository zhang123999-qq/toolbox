import type { PrefixSuffixInput, PrefixSuffixOptions } from './schema'

/** 逐行加前缀与后缀；默认跳过空行，避免给空行也挂一串符号 */
export function transform(input: PrefixSuffixInput, options: PrefixSuffixOptions): string {
  return input.text
    .split(/\r?\n/)
    .map((line) =>
      options.skipEmpty && line === '' ? line : options.prefix + line + options.suffix,
    )
    .join('\n')
}
