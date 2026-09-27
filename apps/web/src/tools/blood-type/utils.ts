// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import { INPUT_MAX_CHARS, inputSchema, optionsSchema } from './schema'
import type { BloodTypeInput, BloodTypeOptions } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class BloodTypeError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'BloodTypeError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：BloodTypeError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof BloodTypeError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** ABO 血型（展示顺序：O → A → B → AB） */
export const ABO_TYPES = ['O', 'A', 'B', 'AB'] as const
export type AboType = (typeof ABO_TYPES)[number]

/** Rh 因子 */
export const RH_TYPES = ['-', '+'] as const
export type RhType = (typeof RH_TYPES)[number]

const RH_NEGATIVE: RhType = '-'
const RH_POSITIVE: RhType = '+'

export interface BloodType {
  readonly abo: AboType
  readonly rh: RhType
}

/** 8 种血型（O-、O+、A-、A+、B-、B+、AB-、AB+） */
export const ALL_BLOOD_TYPES: readonly BloodType[] = ABO_TYPES.flatMap((abo) =>
  RH_TYPES.map((rh) => ({ abo, rh })),
)

/** ABO 抗原表：O 无抗原，AB 两种都有 */
const ABO_ANTIGENS: Record<AboType, readonly ('A' | 'B')[]> = {
  O: [],
  A: ['A'],
  B: ['B'],
  AB: ['A', 'B'],
}

/**
 * 红细胞输血相容性（纯函数）。
 * 规则：供者红细胞携带的 ABO 抗原必须是受者拥有的子集
 * （否则受者血浆中的抗体攻击供者红细胞）；Rh+ 只能输给 Rh+。
 */
export function canDonateRbc(donor: BloodType, recipient: BloodType): boolean {
  const donorAntigens = ABO_ANTIGENS[donor.abo]
  const recipientAntigens = ABO_ANTIGENS[recipient.abo]
  if (!donorAntigens.every((antigen) => recipientAntigens.includes(antigen))) return false
  if (donor.rh === RH_POSITIVE && recipient.rh === RH_NEGATIVE) return false
  return true
}

/**
 * 血浆输血相容性（纯函数）：与红细胞相反。
 * 供者血浆中的抗体不得攻击受者红细胞 ⇔ 受者红细胞携带的 ABO 抗原
 * 必须是供者拥有的子集（否则供者血浆中的抗体攻击受者红细胞）。
 * 注意：Rh(D) 抗原只存在于红细胞上，血浆输注不受 Rh 限制。
 */
export function canDonatePlasma(donor: BloodType, recipient: BloodType): boolean {
  const donorAntigens = ABO_ANTIGENS[donor.abo]
  const recipientAntigens = ABO_ANTIGENS[recipient.abo]
  return recipientAntigens.every((antigen) => donorAntigens.includes(antigen))
}

export interface CompatibilityPair {
  readonly donor: BloodType
  readonly recipient: BloodType
  readonly compatible: boolean
}

/** 穷举 8×8=64 种供受者组合建表 */
function buildPairs(
  check: (donor: BloodType, recipient: BloodType) => boolean,
): readonly CompatibilityPair[] {
  const pairs: CompatibilityPair[] = []
  for (const donor of ALL_BLOOD_TYPES) {
    for (const recipient of ALL_BLOOD_TYPES) {
      pairs.push({ donor, recipient, compatible: check(donor, recipient) })
    }
  }
  return pairs
}

/** 红细胞输血相容表（64 条，穷举） */
export const RBC_COMPATIBILITY: readonly CompatibilityPair[] = buildPairs(canDonateRbc)

/** 血浆输血相容表（64 条，穷举） */
export const PLASMA_COMPATIBILITY: readonly CompatibilityPair[] = buildPairs(canDonatePlasma)

function sameType(a: BloodType, b: BloodType): boolean {
  return a.abo === b.abo && a.rh === b.rh
}

/** 某受血者可接受的供血者（红细胞） */
export function rbcDonorsFor(recipient: BloodType): BloodType[] {
  return RBC_COMPATIBILITY.filter((p) => sameType(p.recipient, recipient) && p.compatible).map(
    (p) => p.donor,
  )
}

/** 某供血者可捐献的受血者（红细胞） */
export function rbcRecipientsFor(donor: BloodType): BloodType[] {
  return RBC_COMPATIBILITY.filter((p) => sameType(p.donor, donor) && p.compatible).map(
    (p) => p.recipient,
  )
}

/** 某受血者可接受的供血者（血浆） */
export function plasmaDonorsFor(recipient: BloodType): BloodType[] {
  return PLASMA_COMPATIBILITY.filter((p) => sameType(p.recipient, recipient) && p.compatible).map(
    (p) => p.donor,
  )
}

/** 某供血者可捐献的受血者（血浆） */
export function plasmaRecipientsFor(donor: BloodType): BloodType[] {
  return PLASMA_COMPATIBILITY.filter((p) => sameType(p.donor, donor) && p.compatible).map(
    (p) => p.recipient,
  )
}

export function formatBloodType(t: BloodType): string {
  return `${t.abo}${t.rh}`
}

function joinTypes(types: readonly BloodType[]): string {
  return types.map(formatBloodType).join('、')
}

const BLOOD_RE = /^(AB|A|B|O)([+-])?$/

/**
 * 解析血型输入：大小写 / 空格不敏感（如 "a+"、"A +"）。
 * Rh 省略时返回 +/- 两种，调用方分别展示。
 */
export function parseBloodType(raw: string): BloodType[] {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '')
  const m = BLOOD_RE.exec(s)
  if (!m) throw new BloodTypeError('bloodType.error.invalid', { value: raw.trim() })
  const abo = m[1] as AboType
  const rh = m[2] as RhType | undefined
  if (rh === undefined) {
    return [
      { abo, rh: RH_NEGATIVE },
      { abo, rh: RH_POSITIVE },
    ]
  }
  return [{ abo, rh }]
}

/** 单个受血者的完整配对文本（双语由 t 决定） */
function formatOne(recipient: BloodType, t: Translate): string {
  return [
    `${t('bloodType.label.recipient')}：${formatBloodType(recipient)}`,
    `${t('bloodType.label.donorsRbc')}：${joinTypes(rbcDonorsFor(recipient))}`,
    `${t('bloodType.label.recipientsRbc')}：${joinTypes(rbcRecipientsFor(recipient))}`,
    `${t('bloodType.label.donorsPlasma')}：${joinTypes(plasmaDonorsFor(recipient))}`,
    `${t('bloodType.label.recipientsPlasma')}：${joinTypes(plasmaRecipientsFor(recipient))}`,
  ].join('\n')
}

/**
 * T2 模板的同步入口：空输入返回 ''，非法输入抛本地化后的 Error。
 * t 由调用方显式传入（Tool 传 useTranslate()，单测传 createTranslator('zh'/'en')）。
 */
export function transform(input: BloodTypeInput, options: BloodTypeOptions, t: Translate): string {
  try {
    if (input.text.trim() === '') return ''
    if (input.text.length > INPUT_MAX_CHARS) throw new BloodTypeError('bloodType.error.tooLong')
    inputSchema.parse(input)
    optionsSchema.parse(options)
    const types = parseBloodType(input.text)
    const sections = types.map((bt) => formatOne(bt, t))
    return sections.join('\n\n') + '\n' + t('bloodType.note.plasma')
  } catch (error) {
    throw new Error(localizeError(error, t), { cause: error })
  }
}
