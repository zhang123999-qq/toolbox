/**
 * culori 的最小类型声明（上游包不带 .d.ts）。
 *
 * 只声明 color-palette-gen 真正用到的三个成员：parse / oklch / formatHex。
 * `oklch` 在此声明为必定返回 Oklch：上游实现里它只在入参为 undefined 时才返回
 * undefined，而本工具只在 `parse` 成功（已排除 undefined）后调用它，
 * 因此该分支在实践中不可达；声明为非空可避免为防御性分支写永远跑不到的用例。
 */
declare module 'culori' {
  /** culori 解析出的颜色对象（各通道按 mode 而定） */
  export interface CuloriColor {
    readonly mode: string
    readonly r?: number
    readonly g?: number
    readonly b?: number
    readonly alpha?: number
  }

  /** Oklch 颜色：h 在无彩色（c = 0）时为 undefined */
  export interface Oklch {
    readonly mode: 'oklch'
    readonly l: number
    readonly c: number
    readonly h?: number
    readonly alpha?: number
  }

  /** 解析 CSS 颜色串（#rgb / #rrggbb / 颜色名 / rgb() …），失败返回 undefined */
  export function parse(color: string): CuloriColor | undefined
  /** 把已解析的颜色转到 Oklch 空间 */
  export function oklch(color: CuloriColor): Oklch
  /** 序列化为 #rrggbb（越界通道按 sRGB 钳制，保证恒为合法 hex） */
  export function formatHex(color: Oklch): string
}
