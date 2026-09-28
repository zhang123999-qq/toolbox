/**
 * fortune（#841）工具函数：传统求签签文抽取。
 * 纯函数，无 DOM / 网络依赖。娱乐占卜，非预测工具。
 */

export type Luck = '上上' | '上吉' | '中吉' | '中平' | '下下'

export interface Fortune {
  readonly no: number
  readonly luck: Luck
  readonly title: string
  readonly verse: string
  readonly meaning: string
}

export const LUCKS: readonly Luck[] = ['上上', '上吉', '中吉', '中平', '下下']

/** 签文库：30 签 */
export const FORTUNES: readonly Fortune[] = [
  {
    no: 1,
    luck: '上上',
    title: '大展宏图',
    verse: '云开月出正分明，不须进退问前程；\n但得清风常在手，何愁大地不逢春。',
    meaning: '时运亨通，宜积极进取，所谋皆遂。',
  },
  {
    no: 2,
    luck: '上上',
    title: '龙门得意',
    verse: '鲤鱼跃过龙门去，风送征帆万里程；\n从此青云平步上，前程锦绣任君行。',
    meaning: '贵人相助，功名有望，大胆前行。',
  },
  {
    no: 3,
    luck: '上上',
    title: '花开满园',
    verse: '春风得意马蹄疾，一日看尽长安花；\n好事从天而降至，家门喜气满庭华。',
    meaning: '喜事临门，诸事顺遂，宜把握良机。',
  },
  {
    no: 4,
    luck: '上上',
    title: '月圆人圆',
    verse: '十五月圆人亦圆，团圆美满乐陶然；\n谋望从心多吉庆，平安喜乐度年年。',
    meaning: '家庭和睦，心想事成，守成为上。',
  },
  {
    no: 5,
    luck: '上上',
    title: '金榜题名',
    verse: '十年寒窗无人问，一举成名天下知；\n皇榜高悬君名在，衣锦还乡正当时。',
    meaning: '苦尽甘来，学业事业皆有收获。',
  },
  {
    no: 6,
    luck: '上上',
    title: '旭日东升',
    verse: '旭日初升照大地，万物回春气象新；\n前途光明无限好，乘风破浪正逢时。',
    meaning: '运势上升，宜开创新局。',
  },
  {
    no: 7,
    luck: '上吉',
    title: '贵人扶持',
    verse: '山重水复疑无路，柳暗花明又一村；\n贵人暗中相扶助，危难之时见真情。',
    meaning: '困境中有贵人相助，宜广结善缘。',
  },
  {
    no: 8,
    luck: '上吉',
    title: '水到渠成',
    verse: '欲速则不达其功，瓜熟蒂落自然红；\n时来运转皆如意，好事成双喜气浓。',
    meaning: '时机未到宜等待，水到渠成莫强求。',
  },
  {
    no: 9,
    luck: '上吉',
    title: '和气生财',
    verse: '和气能生万里财，家中笑语自天来；\n不须劳碌去奔走，财源滚滚入户来。',
    meaning: '以和为贵，财运渐旺。',
  },
  {
    no: 10,
    luck: '上吉',
    title: '守旧待时',
    verse: '守得云开见月明，耐心等待好时光；\n莫教贪念乱方寸，静守家门福自臻。',
    meaning: '宜守不宜攻，静待时机。',
  },
  {
    no: 11,
    luck: '上吉',
    title: '枯木逢春',
    verse: '枯木逢春再发芽，旧业重整气象佳；\n从前错失今番补，东山再起不须嗟。',
    meaning: '困境将过，转机在前。',
  },
  {
    no: 12,
    luck: '上吉',
    title: '一帆风顺',
    verse: '一帆风顺过江来，波平浪静少尘埃；\n行人路上无阻滞，万事亨通不用猜。',
    meaning: '行程顺利，所谋易成。',
  },
  {
    no: 13,
    luck: '中吉',
    title: '先难后易',
    verse: '路遥知马力，日久见人心；\n先历风霜苦，后享太平春。',
    meaning: '先苦后甜，坚持到底必有回报。',
  },
  {
    no: 14,
    luck: '中吉',
    title: '量力而行',
    verse: '小溪虽小流不息，大海虽大有涯际；\n自知分量行方便，何必登高去摘星。',
    meaning: '量力而行，稳扎稳打为吉。',
  },
  {
    no: 15,
    luck: '中吉',
    title: '以静制动',
    verse: '静坐常思己过，闲谈莫论人非；\n能受苦中苦，方为人上人。',
    meaning: '修身养性，以静待变。',
  },
  {
    no: 16,
    luck: '中吉',
    title: '薄利多销',
    verse: '薄利广销路自宽，诚信经营客自还；\n莫贪一时蝇头利，长流水复潺潺。',
    meaning: '经商宜薄利多销，细水长流。',
  },
  {
    no: 17,
    luck: '中吉',
    title: '家和万事兴',
    verse: '家和万事兴，人和百业旺；\n莫因小事伤和气，忍让三分福满堂。',
    meaning: '家庭和睦是福，忍让为上。',
  },
  {
    no: 18,
    luck: '中吉',
    title: '学无止境',
    verse: '书山有路勤为径，学海无涯苦作舟；\n今日辛勤播种下，明朝收获满仓收。',
    meaning: '勤学不辍，必有成就。',
  },
  {
    no: 19,
    luck: '中平',
    title: '平淡是福',
    verse: '平平淡淡才是真，安安稳稳度晨昏；\n不羡他人富贵景，自家清福最可珍。',
    meaning: '守成安稳，不宜妄动。',
  },
  {
    no: 20,
    luck: '中平',
    title: '欲速不达',
    verse: '心急吃不了热豆腐，步步为营才是谋；\n若将大事轻举动，恐惹烦恼上心头。',
    meaning: '戒急用忍，谋定后动。',
  },
  {
    no: 21,
    luck: '中平',
    title: '防小人',
    verse: '明枪易躲暗箭难，口蜜腹剑须提防；\n交友须交心莫交面，谨言慎行保安康。',
    meaning: '提防口舌是非，低调行事。',
  },
  {
    no: 22,
    luck: '中平',
    title: '且待来年',
    verse: '今年运气多反复，明年方见好光阴；\n且将凡事且宽缓，守得阳春又一春。',
    meaning: '今年平平，宜蓄势待发。',
  },
  {
    no: 23,
    luck: '中平',
    title: '知足常乐',
    verse: '知足者常乐，能忍者自安；\n莫与他人比高下，自有清福在心间。',
    meaning: '知足常乐，勿生贪念。',
  },
  {
    no: 24,
    luck: '中平',
    title: '谨慎前行',
    verse: '前路荆棘多险阻，步步小心莫疏忽；\n若能谨慎持盈保，终究安稳到坦途。',
    meaning: '行事谨慎，可保平安。',
  },
  {
    no: 25,
    luck: '下下',
    title: '困龙得水',
    verse: '困龙暂且卧滩头，等待风云始出头；\n目下低头且忍耐，他时腾跃上云楼。',
    meaning: '目下困顿，忍耐等待转机。',
  },
  {
    no: 26,
    luck: '下下',
    title: '破财免灾',
    verse: '破财原为免灾星，钱财散去祸不生；\n留得青山在不怕，没柴烧处且宽心。',
    meaning: '近期恐有破财，宜谨慎理财。',
  },
  {
    no: 27,
    luck: '下下',
    title: '退步原来是向前',
    verse: '进退须知有定时，强求反误好光阴；\n不如退步思量久，静待天时再展眉。',
    meaning: '宜退守，不宜进取。',
  },
  {
    no: 28,
    luck: '下下',
    title: '病去如抽丝',
    verse: '病来如山倒，病去如抽丝；\n调养须有时，切莫太心急。',
    meaning: '健康宜调养，不可操劳。',
  },
  {
    no: 29,
    luck: '下下',
    title: '是非口舌',
    verse: '是非只为多开口，烦恼皆因强出头；\n闭口深藏舌，安身处处悠。',
    meaning: '谨言慎行，远离是非。',
  },
  {
    no: 30,
    luck: '下下',
    title: '否极泰来',
    verse: '否极泰来终有日，守得云开见月明；\n劝君切莫心灰冷，好运将来伴君行。',
    meaning: '谷底将过，保持信心。',
  },
]

/** 可注入的随机数，便于单测确定性 */
export type Rng = () => number

/**
 * 求签：从签文库随机抽一签。
 * rng 返回 [0,1)；返回 1 时视为异常分支（测试可覆盖）。
 */
export function drawFortune(rng: Rng = Math.random): Fortune {
  const idx = Math.floor(rng() * FORTUNES.length)
  const f = FORTUNES[idx]
  if (f === undefined) throw new Error('求签失败：签筒为空')
  return f
}

/** 按吉凶筛选签文；无匹配抛中文错误 */
export function fortunesByLuck(luck: string): Fortune[] {
  const list = FORTUNES.filter((f) => f.luck === luck)
  if (list.length === 0) throw new Error(`没有「${luck}」等级的签文`)
  return list
}

/** 单签格式化为可读文本 */
export function formatFortune(f: Fortune): string {
  return `第 ${f.no} 签${f.title}\n${f.verse}\n解曰：${f.meaning}`
}
