import { useState } from 'react'
import { TwoColumn, SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { analyzeFile, downloadBytes, formatSize, packAll } from './utils'
import type { ZipEntry } from './utils'
import type { UnzipInput, UnzipOptions } from './schema'

export default function Tool() {
  const t = useTranslate()
  const [entries, setEntries] = useState<ZipEntry[]>([])
  const [archiveName, setArchiveName] = useState('')

  /** T2 文件入口：解析 zip，报告进输出区，条目留给下方的下载面板 */
  async function onFile(file: File, options: UnzipOptions): Promise<string> {
    const result = await analyzeFile(file, options)
    setEntries(result.entries)
    setArchiveName(file.name)
    return result.report
  }

  function downloadEntry(entry: ZipEntry) {
    // 目录没有可下载的内容
    if (entry.isDir) return
    const filename = entry.name.split('/').pop() ?? entry.name
    downloadBytes(filename === '' ? 'unnamed' : filename, entry.data)
  }

  function downloadAll() {
    const files = entries.filter((e) => !e.isDir)
    if (files.length === 0) return
    const base = archiveName.replace(/\.zip$/i, '')
    downloadBytes(
      `${base === '' ? 'archive' : base}-extracted.zip`,
      packAll(entries),
      'application/zip',
    )
  }

  return (
    <>
      <TwoColumn<UnzipInput, UnzipOptions>
        meta={meta}
        initialInput={{ text: '' }}
        initialOptions={{}}
        idleText="用左下的「选择文件」上传 ZIP 压缩包，查看包内清单"
        fileInput={{ label: t('tool.file') + '（.zip，≤ 200 MiB）', accept: '.zip', onFile }}
      />
      {entries.length > 0 && (
        <section
          aria-label="解压下载"
          className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              包内文件（{entries.filter((e) => !e.isDir).length} 个可下载）
            </h2>
            <button
              type="button"
              data-testid="download-all"
              className={SECONDARY_BUTTON}
              onClick={downloadAll}
            >
              全部打包下载
            </button>
          </div>
          <ul data-testid="entry-list" className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between gap-2 py-1.5 text-sm"
              >
                <span className="min-w-0">
                  <span
                    className={
                      entry.isDir
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'font-mono text-slate-800 dark:text-slate-100'
                    }
                  >
                    {entry.name}
                  </span>
                  {!entry.isDir && (
                    <span className="ml-2 text-xs tabular-nums text-slate-500">
                      {formatSize(entry.size)}
                    </span>
                  )}
                </span>
                {!entry.isDir && (
                  <button
                    type="button"
                    data-testid={'download-entry-' + entry.name}
                    className={SECONDARY_BUTTON}
                    onClick={() => downloadEntry(entry)}
                  >
                    下载
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
