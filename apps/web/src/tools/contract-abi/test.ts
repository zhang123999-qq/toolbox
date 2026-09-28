import { describe, expect, it } from 'vitest'
import {
  abiToItems,
  bytesToHex,
  canonicalSignature,
  eventTopic,
  filterItems,
  functionSelector,
  keccak256,
  parseAbi,
  type AbiEntry,
} from './utils'

const ERC20_ABI = `[
  {"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable"},
  {"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"event","name":"Transfer","inputs":[{"name":"from","type":"address","indexed":true},{"name":"to","type":"address","indexed":true},{"name":"value","type":"uint256","indexed":false}],"anonymous":false}
]`

describe('contract-abi · keccak', () => {
  it('空串向量', () => {
    expect(bytesToHex(keccak256(new Uint8Array(0)))).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    )
  })

  it('多块输入（200 字节，与 pycryptodome 交叉验证）', () => {
    const data = new TextEncoder().encode('a'.repeat(200))
    expect(bytesToHex(keccak256(data))).toBe(
      '96ea54061def936c4be90b518992fdc6f12f535068a256229aca54267b4d084d',
    )
  })
})

describe('contract-abi · parseAbi', () => {
  it('解析 ERC20 ABI', () => {
    const abi = parseAbi(ERC20_ABI)
    expect(abi).toHaveLength(3)
  })

  it('非 JSON 报错', () => {
    expect(() => parseAbi('not json')).toThrow('ABI 不是合法 JSON')
  })

  it('非数组报错', () => {
    expect(() => parseAbi('{"type":"function"}')).toThrow('ABI 应为 JSON 数组')
  })

  it('空数组报错', () => {
    expect(() => parseAbi('[]')).toThrow('ABI 数组为空')
  })

  it('非对象条目报错', () => {
    expect(() => parseAbi('[1]')).toThrow('第 1 项不是对象')
  })

  it('缺 type 报错', () => {
    expect(() => parseAbi('[{"name":"x"}]')).toThrow('缺少 type 字段')
  })
})

describe('contract-abi · 签名与哈希', () => {
  it('transfer 选择器为 0xa9059cbb', () => {
    expect(functionSelector('transfer(address,uint256)')).toBe('0xa9059cbb')
  })

  it('balanceOf 选择器为 0x70a08231', () => {
    expect(functionSelector('balanceOf(address)')).toBe('0x70a08231')
  })

  it('Transfer 事件主题', () => {
    expect(eventTopic('Transfer(address,address,uint256)')).toBe(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    )
  })

  it('tuple 参数展开', () => {
    const entry: AbiEntry = {
      type: 'function',
      name: 'batch',
      inputs: [
        {
          name: 'items',
          type: 'tuple[]',
          components: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
        },
      ],
    }
    expect(canonicalSignature(entry)).toBe('batch((address,uint256)[])')
  })

  it('tuple 无 components 时为空元组', () => {
    const entry: AbiEntry = { type: 'function', name: 'f', inputs: [{ name: 't', type: 'tuple' }] }
    expect(canonicalSignature(entry)).toBe('f(())')
  })

  it('无 inputs 字段时签名为空参数', () => {
    expect(canonicalSignature({ type: 'function', name: 'f' })).toBe('f()')
  })

  it('无 name 报错', () => {
    expect(() => canonicalSignature({ type: 'function' })).toThrow('缺少 name 字段')
  })
})

describe('contract-abi · abiToItems', () => {
  it('提取函数与事件', () => {
    const items = abiToItems(parseAbi(ERC20_ABI))
    expect(items).toHaveLength(3)
    const transfer = items.find((i) => i.name === 'transfer')
    expect(transfer?.kind).toBe('function')
    expect(transfer?.signature).toBe('transfer(address,uint256)')
    expect(transfer?.hash).toBe('0xa9059cbb')
    expect(transfer?.mutability).toBe('nonpayable')
    const event = items.find((i) => i.kind === 'event')
    expect(event?.hash).toHaveLength(66)
  })

  it('跳过 constructor 等条目', () => {
    const items = abiToItems(parseAbi('[{"type":"constructor","inputs":[]}]'))
    expect(items).toHaveLength(0)
  })

  it('无参数函数', () => {
    const items = abiToItems(parseAbi('[{"type":"function","name":"total","inputs":[]}]'))
    expect(items[0].signature).toBe('total()')
    expect(items[0].inputs).toBe('无参数')
  })

  it('缺 mutability 显示 -', () => {
    const items = abiToItems(parseAbi('[{"type":"function","name":"f","inputs":[]}]'))
    expect(items[0].mutability).toBe('-')
  })

  it('缺 inputs 字段的条目', () => {
    const items = abiToItems(parseAbi('[{"type":"function","name":"f"}]'))
    expect(items[0].signature).toBe('f()')
    expect(items[0].inputs).toBe('无参数')
  })
})

describe('contract-abi · filterItems', () => {
  it('关键字过滤', () => {
    const items = abiToItems(parseAbi(ERC20_ABI))
    expect(filterItems(items, 'transfer')).toHaveLength(2) // transfer + Transfer
    expect(filterItems(items, 'balance')).toHaveLength(1)
    expect(filterItems(items, 'zzz')).toHaveLength(0)
  })

  it('空关键字返回全部', () => {
    const items = abiToItems(parseAbi(ERC20_ABI))
    expect(filterItems(items, '  ')).toHaveLength(3)
  })
})
