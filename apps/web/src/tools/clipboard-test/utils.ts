/**
 * clipboard-test —— 剪贴板读写检测的纯函数层
 *
 * navigator.clipboard 经参数注入（可为字面 mock）；
 * 能力检测、写入、读取、写后读回一致性校验均为纯函数。
 * 需要 HTTPS 环境，无 API 时抛中文错。
 */

/** Clipboard 接口子集 */
export interface ClipboardLike {
  writeText?: (text: string) => Promise<void>
  readText?: () => Promise<string>
}

/** 可注入的 navigator 形状 */
export interface ClipboardNavigatorLike {
  clipboard?: ClipboardLike | null
}

/**
 * 是否具备剪贴板读写能力：navigator.clipboard 存在且读写函数均可用。
 * 组件中传入全局 navigator；测试中可注入字面 mock。
 */
export function supportsClipboard(nav?: ClipboardNavigatorLike | null): boolean {
  return (
    nav != null &&
    nav.clipboard != null &&
    typeof nav.clipboard.writeText === 'function' &&
    typeof nav.clipboard.readText === 'function'
  )
}

/** 写入文本到剪贴板。clip 为空或无 writeText 时抛中文错。 */
export async function writeText(clip?: ClipboardLike | null, text = ''): Promise<void> {
  if (clip == null || typeof clip.writeText !== 'function') {
    throw new Error('当前浏览器不支持 Clipboard 写入（需要 HTTPS 环境）')
  }
  await clip.writeText(text)
}

/** 从剪贴板读取文本。clip 为空或无 readText 时抛中文错。 */
export async function readText(clip?: ClipboardLike | null): Promise<string> {
  if (clip == null || typeof clip.readText !== 'function') {
    throw new Error('当前浏览器不支持 Clipboard 读取（需要 HTTPS 环境）')
  }
  return clip.readText()
}

/** 往返校验结果 */
export interface RoundtripResult {
  readonly ok: boolean
  readonly readBack: string
}

/** 写入后读回，比较是否一致 */
export async function roundtripCheck(
  clip?: ClipboardLike | null,
  text = '',
): Promise<RoundtripResult> {
  await writeText(clip, text)
  const readBack = await readText(clip)
  return { ok: readBack === text, readBack }
}

/** 结果中文描述 */
export function roundtripText(r: RoundtripResult): string {
  return r.ok ? `往返一致（读回 ${r.readBack.length} 字）` : '往返不一致：读回内容与写入不同'
}
