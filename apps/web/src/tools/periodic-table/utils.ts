/**
 * periodic-table（#821）工具函数：118 元素数据表与查询。
 * 纯函数，无 DOM / 网络依赖。
 */

export type ElementCategory =
  | '非金属'
  | '碱金属'
  | '碱土金属'
  | '过渡金属'
  | '贫金属'
  | '类金属'
  | '卤素'
  | '稀有气体'
  | '镧系'
  | '锕系'

export interface ChemicalElement {
  readonly n: number
  readonly symbol: string
  readonly name: string
  readonly nameEn: string
  /** 原子量；人工合成元素用方括号标注最稳定同位素质量数 */
  readonly mass: string
  /** 族；镧系/锕系填 0 表示不适用 */
  readonly group: number
  readonly period: number
  readonly category: ElementCategory
}

/** [原子序数, 符号, 中文名, 英文名, 原子量, 族, 周期, 分类] */
const RAW: ReadonlyArray<
  [number, string, string, string, string, number, number, ElementCategory]
> = [
  [1, 'H', '氢', 'Hydrogen', '1.008', 1, 1, '非金属'],
  [2, 'He', '氦', 'Helium', '4.0026', 18, 1, '稀有气体'],
  [3, 'Li', '锂', 'Lithium', '6.94', 1, 2, '碱金属'],
  [4, 'Be', '铍', 'Beryllium', '9.0122', 2, 2, '碱土金属'],
  [5, 'B', '硼', 'Boron', '10.81', 13, 2, '类金属'],
  [6, 'C', '碳', 'Carbon', '12.011', 14, 2, '非金属'],
  [7, 'N', '氮', 'Nitrogen', '14.007', 15, 2, '非金属'],
  [8, 'O', '氧', 'Oxygen', '15.999', 16, 2, '非金属'],
  [9, 'F', '氟', 'Fluorine', '18.998', 17, 2, '卤素'],
  [10, 'Ne', '氖', 'Neon', '20.180', 18, 2, '稀有气体'],
  [11, 'Na', '钠', 'Sodium', '22.990', 1, 3, '碱金属'],
  [12, 'Mg', '镁', 'Magnesium', '24.305', 2, 3, '碱土金属'],
  [13, 'Al', '铝', 'Aluminium', '26.982', 13, 3, '贫金属'],
  [14, 'Si', '硅', 'Silicon', '28.085', 14, 3, '类金属'],
  [15, 'P', '磷', 'Phosphorus', '30.974', 15, 3, '非金属'],
  [16, 'S', '硫', 'Sulfur', '32.06', 16, 3, '非金属'],
  [17, 'Cl', '氯', 'Chlorine', '35.45', 17, 3, '卤素'],
  [18, 'Ar', '氩', 'Argon', '39.948', 18, 3, '稀有气体'],
  [19, 'K', '钾', 'Potassium', '39.098', 1, 4, '碱金属'],
  [20, 'Ca', '钙', 'Calcium', '40.078', 2, 4, '碱土金属'],
  [21, 'Sc', '钪', 'Scandium', '44.956', 3, 4, '过渡金属'],
  [22, 'Ti', '钛', 'Titanium', '47.867', 4, 4, '过渡金属'],
  [23, 'V', '钒', 'Vanadium', '50.942', 5, 4, '过渡金属'],
  [24, 'Cr', '铬', 'Chromium', '51.996', 6, 4, '过渡金属'],
  [25, 'Mn', '锰', 'Manganese', '54.938', 7, 4, '过渡金属'],
  [26, 'Fe', '铁', 'Iron', '55.845', 8, 4, '过渡金属'],
  [27, 'Co', '钴', 'Cobalt', '58.933', 9, 4, '过渡金属'],
  [28, 'Ni', '镍', 'Nickel', '58.693', 10, 4, '过渡金属'],
  [29, 'Cu', '铜', 'Copper', '63.546', 11, 4, '过渡金属'],
  [30, 'Zn', '锌', 'Zinc', '65.38', 12, 4, '过渡金属'],
  [31, 'Ga', '镓', 'Gallium', '69.723', 13, 4, '贫金属'],
  [32, 'Ge', '锗', 'Germanium', '72.630', 14, 4, '类金属'],
  [33, 'As', '砷', 'Arsenic', '74.922', 15, 4, '类金属'],
  [34, 'Se', '硒', 'Selenium', '78.971', 16, 4, '非金属'],
  [35, 'Br', '溴', 'Bromine', '79.904', 17, 4, '卤素'],
  [36, 'Kr', '氪', 'Krypton', '83.798', 18, 4, '稀有气体'],
  [37, 'Rb', '铷', 'Rubidium', '85.468', 1, 5, '碱金属'],
  [38, 'Sr', '锶', 'Strontium', '87.62', 2, 5, '碱土金属'],
  [39, 'Y', '钇', 'Yttrium', '88.906', 3, 5, '过渡金属'],
  [40, 'Zr', '锆', 'Zirconium', '91.224', 4, 5, '过渡金属'],
  [41, 'Nb', '铌', 'Niobium', '92.906', 5, 5, '过渡金属'],
  [42, 'Mo', '钼', 'Molybdenum', '95.95', 6, 5, '过渡金属'],
  [43, 'Tc', '锝', 'Technetium', '[98]', 7, 5, '过渡金属'],
  [44, 'Ru', '钌', 'Ruthenium', '101.07', 8, 5, '过渡金属'],
  [45, 'Rh', '铑', 'Rhodium', '102.91', 9, 5, '过渡金属'],
  [46, 'Pd', '钯', 'Palladium', '106.42', 10, 5, '过渡金属'],
  [47, 'Ag', '银', 'Silver', '107.87', 11, 5, '过渡金属'],
  [48, 'Cd', '镉', 'Cadmium', '112.41', 12, 5, '过渡金属'],
  [49, 'In', '铟', 'Indium', '114.82', 13, 5, '贫金属'],
  [50, 'Sn', '锡', 'Tin', '118.71', 14, 5, '贫金属'],
  [51, 'Sb', '锑', 'Antimony', '121.76', 15, 5, '类金属'],
  [52, 'Te', '碲', 'Tellurium', '127.60', 16, 5, '类金属'],
  [53, 'I', '碘', 'Iodine', '126.90', 17, 5, '卤素'],
  [54, 'Xe', '氙', 'Xenon', '131.29', 18, 5, '稀有气体'],
  [55, 'Cs', '铯', 'Caesium', '132.91', 1, 6, '碱金属'],
  [56, 'Ba', '钡', 'Barium', '137.33', 2, 6, '碱土金属'],
  [57, 'La', '镧', 'Lanthanum', '138.91', 0, 6, '镧系'],
  [58, 'Ce', '铈', 'Cerium', '140.12', 0, 6, '镧系'],
  [59, 'Pr', '镨', 'Praseodymium', '140.91', 0, 6, '镧系'],
  [60, 'Nd', '钕', 'Neodymium', '144.24', 0, 6, '镧系'],
  [61, 'Pm', '钷', 'Promethium', '[145]', 0, 6, '镧系'],
  [62, 'Sm', '钐', 'Samarium', '150.36', 0, 6, '镧系'],
  [63, 'Eu', '铕', 'Europium', '151.96', 0, 6, '镧系'],
  [64, 'Gd', '钆', 'Gadolinium', '157.25', 0, 6, '镧系'],
  [65, 'Tb', '铽', 'Terbium', '158.93', 0, 6, '镧系'],
  [66, 'Dy', '镝', 'Dysprosium', '162.50', 0, 6, '镧系'],
  [67, 'Ho', '钬', 'Holmium', '164.93', 0, 6, '镧系'],
  [68, 'Er', '铒', 'Erbium', '167.26', 0, 6, '镧系'],
  [69, 'Tm', '铥', 'Thulium', '168.93', 0, 6, '镧系'],
  [70, 'Yb', '镱', 'Ytterbium', '173.05', 0, 6, '镧系'],
  [71, 'Lu', '镥', 'Lutetium', '174.97', 0, 6, '镧系'],
  [72, 'Hf', '铪', 'Hafnium', '178.49', 4, 6, '过渡金属'],
  [73, 'Ta', '钽', 'Tantalum', '180.95', 5, 6, '过渡金属'],
  [74, 'W', '钨', 'Tungsten', '183.84', 6, 6, '过渡金属'],
  [75, 'Re', '铼', 'Rhenium', '186.21', 7, 6, '过渡金属'],
  [76, 'Os', '锇', 'Osmium', '190.23', 8, 6, '过渡金属'],
  [77, 'Ir', '铱', 'Iridium', '192.22', 9, 6, '过渡金属'],
  [78, 'Pt', '铂', 'Platinum', '195.08', 10, 6, '过渡金属'],
  [79, 'Au', '金', 'Gold', '196.97', 11, 6, '过渡金属'],
  [80, 'Hg', '汞', 'Mercury', '200.59', 12, 6, '过渡金属'],
  [81, 'Tl', '铊', 'Thallium', '204.38', 13, 6, '贫金属'],
  [82, 'Pb', '铅', 'Lead', '207.2', 14, 6, '贫金属'],
  [83, 'Bi', '铋', 'Bismuth', '208.98', 15, 6, '贫金属'],
  [84, 'Po', '钋', 'Polonium', '[209]', 16, 6, '贫金属'],
  [85, 'At', '砹', 'Astatine', '[210]', 17, 6, '卤素'],
  [86, 'Rn', '氡', 'Radon', '[222]', 18, 6, '稀有气体'],
  [87, 'Fr', '钫', 'Francium', '[223]', 1, 7, '碱金属'],
  [88, 'Ra', '镭', 'Radium', '[226]', 2, 7, '碱土金属'],
  [89, 'Ac', '锕', 'Actinium', '[227]', 0, 7, '锕系'],
  [90, 'Th', '钍', 'Thorium', '232.04', 0, 7, '锕系'],
  [91, 'Pa', '镤', 'Protactinium', '231.04', 0, 7, '锕系'],
  [92, 'U', '铀', 'Uranium', '238.03', 0, 7, '锕系'],
  [93, 'Np', '镎', 'Neptunium', '[237]', 0, 7, '锕系'],
  [94, 'Pu', '钚', 'Plutonium', '[244]', 0, 7, '锕系'],
  [95, 'Am', '镅', 'Americium', '[243]', 0, 7, '锕系'],
  [96, 'Cm', '锔', 'Curium', '[247]', 0, 7, '锕系'],
  [97, 'Bk', '锫', 'Berkelium', '[247]', 0, 7, '锕系'],
  [98, 'Cf', '锎', 'Californium', '[251]', 0, 7, '锕系'],
  [99, 'Es', '锿', 'Einsteinium', '[252]', 0, 7, '锕系'],
  [100, 'Fm', '镄', 'Fermium', '[257]', 0, 7, '锕系'],
  [101, 'Md', '钔', 'Mendelevium', '[258]', 0, 7, '锕系'],
  [102, 'No', '锘', 'Nobelium', '[259]', 0, 7, '锕系'],
  [103, 'Lr', '铹', 'Lawrencium', '[266]', 0, 7, '锕系'],
  [104, 'Rf', '𬬻', 'Rutherfordium', '[267]', 4, 7, '过渡金属'],
  [105, 'Db', '𬭊', 'Dubnium', '[268]', 5, 7, '过渡金属'],
  [106, 'Sg', '𬭳', 'Seaborgium', '[269]', 6, 7, '过渡金属'],
  [107, 'Bh', '𬭛', 'Bohrium', '[270]', 7, 7, '过渡金属'],
  [108, 'Hs', '𬭶', 'Hassium', '[277]', 8, 7, '过渡金属'],
  [109, 'Mt', '𬭸', 'Meitnerium', '[278]', 9, 7, '过渡金属'],
  [110, 'Ds', '𬭹', 'Darmstadtium', '[281]', 10, 7, '过渡金属'],
  [111, 'Rg', '錀', 'Roentgenium', '[282]', 11, 7, '过渡金属'],
  [112, 'Cn', '鎶', 'Copernicium', '[285]', 12, 7, '过渡金属'],
  [113, 'Nh', '鉨', 'Nihonium', '[286]', 13, 7, '贫金属'],
  [114, 'Fl', '鈇', 'Flerovium', '[289]', 14, 7, '贫金属'],
  [115, 'Mc', '镆', 'Moscovium', '[290]', 15, 7, '贫金属'],
  [116, 'Lv', '鉝', 'Livermorium', '[293]', 16, 7, '贫金属'],
  [117, 'Ts', '鿬', 'Tennessine', '[294]', 17, 7, '卤素'],
  [118, 'Og', '鿫', 'Oganesson', '[294]', 18, 7, '稀有气体'],
]

export const ELEMENTS: readonly ChemicalElement[] = RAW.map(
  ([n, symbol, name, nameEn, mass, group, period, category]) => ({
    n,
    symbol,
    name,
    nameEn,
    mass,
    group,
    period,
    category,
  }),
)

export const CATEGORIES: readonly ElementCategory[] = [
  '非金属',
  '碱金属',
  '碱土金属',
  '过渡金属',
  '贫金属',
  '类金属',
  '卤素',
  '稀有气体',
  '镧系',
  '锕系',
]

/** 按符号（不区分大小写）/中文名/英文名/原子序数查询；未知即抛中文错误 */
export function getElement(query: string): ChemicalElement {
  const q = query.trim()
  if (q === '') throw new Error('查询不能为空')
  if (/^\d+$/.test(q)) {
    const n = Number(q)
    const byNumber = ELEMENTS.find((el) => el.n === n)
    if (byNumber) return byNumber
    throw new Error(`未找到元素「${q}」`)
  }
  const lower = q.toLowerCase()
  const found = ELEMENTS.find(
    (el) => el.symbol.toLowerCase() === lower || el.name === q || el.nameEn.toLowerCase() === lower,
  )
  if (!found) throw new Error(`未找到元素「${q}」`)
  return found
}

/** 按分类筛选；分类非法即抛中文错误 */
export function elementsByCategory(category: string): ChemicalElement[] {
  if (!CATEGORIES.includes(category as ElementCategory)) {
    throw new Error(`未知分类「${category}」，可选：${CATEGORIES.join('、')}`)
  }
  return ELEMENTS.filter((el) => el.category === category)
}

/** 元素的人类可读摘要 */
export function describeElement(el: ChemicalElement): string {
  const groupText = el.group === 0 ? '镧系/锕系' : `第 ${el.group} 族`
  return [
    `${el.name}（${el.symbol}，${el.nameEn}）`,
    `原子序数：${el.n}｜原子量：${el.mass}`,
    `${groupText}｜第 ${el.period} 周期｜${el.category}`,
  ].join('\n')
}
