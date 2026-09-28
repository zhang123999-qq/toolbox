import { useState } from 'react'
import { meta } from './meta'
import {
  baudRates,
  closePort,
  describePort,
  listPorts,
  openPort,
  requestPort,
  supportsSerial,
} from './utils'
import type { SerialNavigatorLike, SerialPortLike } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

const INPUT_CLASS =
  'rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

/**
 * 串口测试：检测 Web Serial 能力，请求/列出串口，选择波特率打开关闭；
 * 全部调用注入 navigator.serial；API 缺失或用户取消时中文提示。
 */
export default function Tool() {
  const [portCount, setPortCount] = useState(0)
  const [port, setPort] = useState<SerialPortLike | null>(null)
  const [baudRate, setBaudRate] = useState<number>(9600)
  const [opened, setOpened] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')

  function reset(): void {
    setError('')
  }

  async function connect(): Promise<void> {
    reset()
    try {
      const nav = navigator as unknown as SerialNavigatorLike
      if (!supportsSerial(nav)) {
        setError('当前浏览器不支持 Web Serial（需要 Chrome/Edge 等 HTTPS 环境）')
        return
      }
      const p = await requestPort(nav.serial)
      setPort(p)
      setOpened(false)
      setPortCount(1)
      setInfo(`已选择：${describePort(p).label}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '串口请求失败')
    }
  }

  async function list(): Promise<void> {
    reset()
    try {
      const nav = navigator as unknown as SerialNavigatorLike
      const ports = await listPorts(nav.serial)
      setPortCount(ports.length)
      if (ports.length === 0) {
        setInfo('暂无已授权的串口（仅列出已授权端口）')
      } else {
        setInfo(ports.map((p, i) => describePort(p, i).label).join('；'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取授权串口失败')
    }
  }

  async function open(): Promise<void> {
    reset()
    try {
      await openPort(port, baudRate)
      setOpened(true)
      setInfo(`串口已打开，波特率 ${baudRate}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '打开串口失败')
    }
  }

  async function close(): Promise<void> {
    reset()
    try {
      await closePort(port)
      setOpened(false)
      setInfo('串口已关闭')
    } catch (e) {
      setError(e instanceof Error ? e.message : '关闭串口失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_CLASS} data-testid="serial-connect" onClick={connect}>
          请求串口
        </button>
        <button type="button" className={BTN_CLASS} data-testid="serial-list" onClick={list}>
          列出已授权串口
        </button>
        {port && (
          <>
            <select
              className={INPUT_CLASS}
              data-testid="serial-baudrate"
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              aria-label="波特率"
            >
              {baudRates.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {!opened ? (
              <button type="button" className={BTN_CLASS} data-testid="serial-open" onClick={open}>
                打开串口
              </button>
            ) : (
              <button
                type="button"
                className={BTN_CLASS}
                data-testid="serial-close"
                onClick={close}
              >
                关闭串口
              </button>
            )}
          </>
        )}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="serial-info">
        {info || `已授权串口数：${portCount}`}
      </p>
      {error && (
        <p className="text-sm text-red-600" data-testid="serial-error">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        需要 HTTPS 环境并在用户手势中调用；仅列出已授权的端口，未授权时如实提示。工具信息：
        {meta.title}（#870）
      </p>
    </div>
  )
}
