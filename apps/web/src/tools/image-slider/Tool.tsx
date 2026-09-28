import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useTranslate } from '../../i18n'
import { isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import {
  KEYBOARD_STEP,
  aspectStyle,
  assertFileSizeOk,
  clipPathFor,
  errorMessage,
  handlePosition,
  percentFromClientRect,
  stepPercent,
} from './utils'
import type { ImageSliderOptions } from './schema'
import type { SliderDirection } from './utils'

/** 单个槽位（图 A/图 B）已加载的图片 */
interface SlotImage {
  url: string
  width: number
  height: number
  name: string
}

/** 拖拽高亮：当前悬停的投放区 */
type DragOver = 'before' | 'after' | null

/** 键盘微调映射：左右/上下箭头均为 ±2 */
const STEP_KEYS: Record<string, number> = {
  ArrowLeft: -KEYBOARD_STEP,
  ArrowUp: -KEYBOARD_STEP,
  ArrowRight: KEYBOARD_STEP,
  ArrowDown: KEYBOARD_STEP,
}

/** 分隔线方向样式：查表代替条件分支 */
const HANDLE_CLASS: Record<SliderDirection, string> = {
  horizontal:
    'absolute bottom-0 top-0 w-1 -translate-x-1/2 cursor-ew-resize bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]',
  vertical:
    'absolute left-0 right-0 h-1 -translate-y-1/2 cursor-ns-resize bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]',
}

const TRACK_CLASS: Record<SliderDirection, string> = {
  horizontal: 'cursor-ew-resize',
  vertical: 'cursor-ns-resize',
}

export default function Tool() {
  const t = useTranslate()
  const [before, setBefore] = useState<SlotImage | null>(null)
  const [after, setAfter] = useState<SlotImage | null>(null)
  const [errorBefore, setErrorBefore] = useState<string | null>(null)
  const [errorAfter, setErrorAfter] = useState<string | null>(null)
  const [percent, setPercent] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [dragOver, setDragOver] = useState<DragOver>(null)
  const [options, setOptions] = useState<ImageSliderOptions>({ direction: 'horizontal' })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKeyBefore, setInputKeyBefore] = useState(0)
  const [inputKeyAfter, setInputKeyAfter] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  // ref 持有当前 object URL，保证异步加载竞态下也能准确 revoke
  const beforeRef = useRef<SlotImage | null>(null)
  const afterRef = useRef<SlotImage | null>(null)

  const direction: SliderDirection = options.direction

  // 拖拽：document 级监听 mousemove/mouseup，清理函数恒定返回（无提前 return）
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return
      const el = containerRef.current
      if (!el) return
      const p = percentFromClientRect(e.clientX, e.clientY, el.getBoundingClientRect(), direction)
      if (p !== null) setPercent(p)
    }
    const onUp = () => setDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging, direction])

  // 卸载时释放残留的 object URL（reset/替换时已及时释放，这里只处理未重置就离开的场景）
  useEffect(() => {
    return () => {
      if (beforeRef.current) URL.revokeObjectURL(beforeRef.current.url)
      if (afterRef.current) URL.revokeObjectURL(afterRef.current.url)
    }
  }, [])

  async function loadSlot(file: File, slot: 'before' | 'after'): Promise<void> {
    const setErr = slot === 'before' ? setErrorBefore : setErrorAfter
    const ref = slot === 'before' ? beforeRef : afterRef
    setErr(null)
    try {
      assertFileSizeOk(file.size)
      if (!isSupportedImageFile(file)) throw new Error(t('imageSlider.error.unsupported'))
      const img = await loadImageFromBlob(file)
      const next: SlotImage = {
        url: URL.createObjectURL(file),
        width: img.width,
        height: img.height,
        name: file.name,
      }
      const prev = ref.current
      if (prev) URL.revokeObjectURL(prev.url)
      ref.current = next
      if (slot === 'before') setBefore(next)
      else setAfter(next)
    } catch (err) {
      // 图 B 加载失败单独报错，不影响图 A
      setErr(errorMessage(err))
      ref.current = null
      if (slot === 'before') setBefore(null)
      else setAfter(null)
    }
  }

  function handleFiles(files: FileList | null, slot: 'before' | 'after'): void {
    const file = files?.[0]
    if (!file) return
    void loadSlot(file, slot)
  }

  function handleTrackMouseDown(e: ReactMouseEvent<HTMLDivElement>): void {
    // 点击轨道任意位置直接跳转；rect 为 0（未布局）时忽略
    const p = percentFromClientRect(
      e.clientX,
      e.clientY,
      e.currentTarget.getBoundingClientRect(),
      direction,
    )
    if (p !== null) setPercent(p)
  }

  function handleDragStart(e: ReactMouseEvent): void {
    // 不阻止冒泡：handle 上的 mousedown 同样触发轨道跳转，再进入拖拽
    e.preventDefault()
    setDragging(true)
  }

  function handleKeyDown(e: ReactKeyboardEvent): void {
    const delta = STEP_KEYS[e.key]
    if (delta === undefined) return
    e.preventDefault()
    setPercent((p) => stepPercent(p, delta))
  }

  function handleReset(): void {
    if (beforeRef.current) URL.revokeObjectURL(beforeRef.current.url)
    if (afterRef.current) URL.revokeObjectURL(afterRef.current.url)
    beforeRef.current = null
    afterRef.current = null
    setBefore(null)
    setAfter(null)
    setErrorBefore(null)
    setErrorAfter(null)
    setPercent(50)
    setInputKeyBefore((k) => k + 1)
    setInputKeyAfter((k) => k + 1)
    // dragging 不清零：拖拽中途点重置时容器已卸载，onMove 的空守卫会忽略后续 mousemove，
    // 最终由 mouseup 统一把 dragging 复位，避免引入不可达分支
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageSlider.note')}</p>

      {/* 两个投放区：图 A=前/左（上层），图 B=后/右（底层） */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label
          data-testid="drop-before"
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver('before')
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(null)
            handleFiles(e.dataTransfer.files, 'before')
          }}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver === 'before'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <input
            key={inputKeyBefore}
            data-testid="file-before"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files, 'before')}
          />
          <p className="text-sm font-medium">{t('imageSlider.beforeLabel')}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {before ? before.name : t('imageSlider.beforeHint')}
          </p>
        </label>
        <label
          data-testid="drop-after"
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver('after')
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(null)
            handleFiles(e.dataTransfer.files, 'after')
          }}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver === 'after'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <input
            key={inputKeyAfter}
            data-testid="file-after"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files, 'after')}
          />
          <p className="text-sm font-medium">{t('imageSlider.afterLabel')}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {after ? after.name : t('imageSlider.afterHint')}
          </p>
        </label>
      </div>

      {/* 独立错误：用 !== null 守卫（i18n key 合并前 t() 可能返回 undefined 导致空串） */}
      {errorBefore !== null && (
        <p
          data-testid="error-before"
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {errorBefore}
        </p>
      )}
      {errorAfter !== null && (
        <p
          data-testid="error-after"
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {errorAfter}
        </p>
      )}

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageSlider.direction')}
          <select
            data-testid="opt-direction"
            value={direction}
            onChange={(e) =>
              setOptions({ direction: e.target.value as ImageSliderOptions['direction'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="horizontal">{t('imageSlider.directionHorizontal')}</option>
            <option value="vertical">{t('imageSlider.directionVertical')}</option>
          </select>
        </label>
        {(before || after) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageSlider.reset')}
          </button>
        )}
      </div>

      {/* 对比区：两张图就绪才显示（内联 !== null 让 TS 收窄） */}
      {before !== null && after !== null && (
        <div data-testid="compare-area" className="flex flex-col gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageSlider.alignNote')}</p>
          {/* 轨道点击是纯指针快捷操作；键盘等价操作由子元素 slider（role="slider"，方向键微调）提供 */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            ref={containerRef}
            data-testid="compare-track"
            onMouseDown={handleTrackMouseDown}
            style={aspectStyle(before.width, before.height)}
            className={`relative w-full touch-none overflow-hidden rounded-lg border border-slate-300 select-none dark:border-slate-700 ${TRACK_CLASS[direction]} ${
              dragging ? 'cursor-grabbing' : ''
            }`}
          >
            {/* 底层：图 B（后/右） */}
            <img
              data-testid="img-after"
              src={after.url}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-fill"
            />
            {/* 上层：图 A（前/左），按滑块百分比 clip-path 裁剪 */}
            <img
              data-testid="img-before"
              src={before.url}
              alt=""
              draggable={false}
              style={{ clipPath: clipPathFor(percent, direction) }}
              className="absolute inset-0 h-full w-full object-fill"
            />
            {/* 分隔线：可聚焦的 slider，支持拖拽与键盘微调 */}
            <div
              data-testid="slider-handle"
              role="slider"
              tabIndex={0}
              aria-label={t('imageSlider.handleLabel')}
              aria-orientation={direction}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              onMouseDown={handleDragStart}
              onKeyDown={handleKeyDown}
              style={handlePosition(percent, direction)}
              className={HANDLE_CLASS[direction]}
            />
          </div>
          <p data-testid="percent-readout" className="text-sm text-slate-500">
            {t('imageSlider.percentLabel')}
            {Math.round(percent)}%
          </p>
        </div>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-500">{t('imageSlider.maxSizeHint')}</p>
    </div>
  )
}
