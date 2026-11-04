import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useSecureStorage：IndexedDB + AES-GCM 加密存储 Hook（替代 API Key 的明文 localStorage）。
 *
 * 设计说明（诚实边界）：
 * - 值以 AES-GCM-256 加密后存 IndexedDB（数据库 toolbox-secure / 表 kv），
 *   明文不再出现在 localStorage / 明文 IndexedDB 记录里，防「随手 dump localStorage」
 *   与备份/同步工具的明文泄露；
 * - 密钥由 WebCrypto 生成并以 CryptoKey 形式持久化进 IndexedDB（extractable=false），
 *   同源脚本仍可调用解密——本 Hook 提供的是「静态加密 + 混淆屏障」，
 *   不是对同源 XSS 的完整防御（那是 CSP + DOMPurify 的职责）；
 * - 无 crypto.subtle（非安全上下文）时降级为 Base64+XOR 混淆，并明确标记 degraded。
 *
 * API：const { value, ready, set, remove } = useSecureStorage<string>('my-key', '')
 * value 在加载完成前为初始值，ready=false；调用方应在 ready 后再启用依赖该值的逻辑。
 */

const DB_NAME = 'toolbox-secure'
const STORE = 'kv'
const KEY_ID = '__aes_key__'

interface StoredRecord {
  iv: string
  data: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDb().then((db) =>
    new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => {
        db.close() // 每次操作后关闭连接，避免每次调用都泄漏一个 IDBDatabase
        resolve(req.result as T | undefined)
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    }),
  )
}

function idbPut(key: string, value: unknown): Promise<void> {
  return openDb().then((db) =>
    new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key)
      req.onsuccess = () => {
        db.close()
        resolve()
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    }),
  )
}

function idbDelete(key: string): Promise<void> {
  return openDb().then((db) =>
    new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key)
      req.onsuccess = () => {
        db.close()
        resolve()
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    }),
  )
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function hasSubtle(): boolean {
  return typeof crypto !== 'undefined' && Boolean(crypto.subtle)
}

// 单例化「取/生成密钥」：并发首次调用若各自生成密钥，后者会覆盖前者的已存密钥，
// 导致前者加密的数据永久无法解密（加载与 set 并发时真实可达）
let keyPromise: Promise<CryptoKey> | null = null
function getKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const existing = await idbGet<CryptoKey>(KEY_ID)
    if (existing) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    await idbPut(KEY_ID, key)
    return key
  })()
  return keyPromise
}

function bufToB64(buf: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s)
}

function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64)
  const buf = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i)
  return buf.buffer
}

/** 降级混淆：XOR + Base64（仅在无 WebCrypto 时，见文件头说明） */
function obfuscate(text: string): StoredRecord {
  const bytes = encoder.encode(text)
  for (let i = 0; i < bytes.length; i++) bytes[i] = (bytes[i] ?? 0) ^ 0x5a
  return { iv: 'xor', data: bufToB64(bytes.buffer) }
}

function deobfuscate(rec: StoredRecord): string {
  const bytes = new Uint8Array(b64ToBuf(rec.data))
  for (let i = 0; i < bytes.length; i++) bytes[i] = (bytes[i] ?? 0) ^ 0x5a
  return decoder.decode(bytes)
}

export interface SecureStorage<T> {
  readonly value: T
  readonly ready: boolean
  readonly degraded: boolean
  set: (value: T) => Promise<void>
  remove: () => Promise<void>
}

export function useSecureStorage<T>(key: string, initial: T): SecureStorage<T> {
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)
  const [degraded, setDegraded] = useState(false)
  const mounted = useRef(true)
  // 加载代际：key 变化时旧 key 的异步加载可能晚到，覆盖新 key 的值
  const loadSeq = useRef(0)

  useEffect(() => {
    mounted.current = true
    const seq = ++loadSeq.current
    void (async () => {
      try {
        const rec = await idbGet<StoredRecord>(key)
        if (rec && mounted.current && loadSeq.current === seq) {
          let plain: string
          if (rec.iv === 'xor') {
            plain = deobfuscate(rec)
            setDegraded(true)
          } else if (hasSubtle()) {
            const cryptoKey = await getKey()
            const plainBuf = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(rec.iv)) },
              cryptoKey,
              b64ToBuf(rec.data),
            )
            plain = decoder.decode(plainBuf)
          } else {
            plain = ''
          }
          if (plain !== '' && loadSeq.current === seq) setValue(JSON.parse(plain) as T)
        }
      } catch {
        /* 读取失败时保持初始值，ready 仍置 true 避免调用方永久等待 */
      } finally {
        if (mounted.current && loadSeq.current === seq) setReady(true)
      }
    })()
    return () => {
      mounted.current = false
    }
  }, [key])

  const set = useCallback(
    async (next: T): Promise<void> => {
      setValue(next)
      // 持久化失败（配额/隐私模式）时只记日志不抛：调用方不一定 catch，
      // 未处理拒绝会污染控制台；内存值已更新，刷新后回落初始值
      try {
        const plain = JSON.stringify(next)
        if (hasSubtle()) {
          const cryptoKey = await getKey()
          const iv = crypto.getRandomValues(new Uint8Array(12))
          const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(plain))
          await idbPut(key, { iv: bufToB64(iv.buffer), data: bufToB64(data) } satisfies StoredRecord)
        } else {
          setDegraded(true)
          await idbPut(key, obfuscate(plain))
        }
      } catch (error) {
        console.error('[secure-storage] 写入失败', error)
      }
    },
    [key],
  )

  const remove = useCallback(async (): Promise<void> => {
    setValue(initial)
    try {
      await idbDelete(key)
    } catch (error) {
      console.error('[secure-storage] 删除失败', error)
    }
  }, [key, initial])

  return { value, ready, degraded, set, remove }
}
