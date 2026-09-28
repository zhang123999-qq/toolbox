/**
 * qpdf-wasm 共享封装（#489 PDF 加密 / #490 PDF 解密共用）。
 *
 * 背景：pdf-lib 1.17.1 既不能写入加密 PDF（没有加密 API），也不能解密
 * （load 不支持 password，加密文件直接抛 EncryptedPDFError）。纯前端实现
 * 真加密/真解密的唯一可行路线，是 PDF 结构编辑的参考实现 qpdf 编译成的 WASM。
 *
 * 依赖：@neslinesli93/qpdf-wasm（qpdf 12.2.0，ISC 许可证），wasm 文件经 Vite `?url` 打包。
 * 运行在主线程（加解密为同步的 callMain 调用，常规文件 <1s，有 processing 状态提示）。
 */
import createModule, { type QpdfInstance } from '@neslinesli93/qpdf-wasm'
import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'

/**
 * 包自带 d.ts 只声明了部分 FS 方法，这里补全实际用到的。
 * （Emscripten FS 本来就有 writeFile/unlink，只是类型没写全。）
 */
interface QpdfFs {
  writeFile(path: string, data: Uint8Array): void
  readFile(path: string): Uint8Array
  unlink(path: string): void
}

type QpdfModule = Omit<QpdfInstance, 'FS'> & { FS: QpdfFs }

let modulePromise: Promise<QpdfModule> | null = null
let fileSeq = 0

/** 懒加载单例：首次调用时初始化 WASM，后续调用复用同一实例 */
export function getQpdfModule(): Promise<QpdfModule> {
  if (!modulePromise) {
    modulePromise = createModule({ locateFile: () => wasmUrl }).then(
      (m) => m as unknown as QpdfModule,
    )
  }
  return modulePromise
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 静默删除虚拟 FS 中的文件：清理阶段，忽略"文件不存在"等错误 */
function removeQuietly(fs: QpdfFs, path: string): void {
  try {
    fs.unlink(path)
  } catch {
    // 清理失败不影响主流程
  }
}

/**
 * 在虚拟 FS 中运行一次 qpdf 命令。
 *
 * @param input 输入 PDF 字节（写入虚拟 FS 的唯一输入路径）
 * @param buildArgs 由输入/输出路径构造 CLI 参数
 * @returns 输出 PDF 字节
 * @throws qpdf 返回非零退出码、抛异常、未生成输出或输出为空时抛错
 */
export async function runQpdf(
  input: Uint8Array,
  buildArgs: (inputPath: string, outputPath: string) => string[],
): Promise<Uint8Array> {
  const qpdf = await getQpdfModule()
  const id = fileSeq++
  const inputPath = `/qpdf-in-${id}.pdf`
  const outputPath = `/qpdf-out-${id}.pdf`
  try {
    qpdf.FS.writeFile(inputPath, input)
    const args = buildArgs(inputPath, outputPath)
    let code: number
    try {
      code = qpdf.callMain(args)
    } catch (err) {
      throw new Error(`qpdf 执行异常：${errorMessage(err)}`, { cause: err })
    }
    if (code !== 0) throw new Error(`qpdf 执行失败（退出码 ${code}）`)
    let output: Uint8Array
    try {
      output = qpdf.FS.readFile(outputPath)
    } catch (err) {
      throw new Error(`qpdf 未生成输出文件：${errorMessage(err)}`, { cause: err })
    }
    if (output.length === 0) throw new Error('qpdf 输出文件为空')
    return output
  } finally {
    removeQuietly(qpdf.FS, inputPath)
    removeQuietly(qpdf.FS, outputPath)
  }
}
