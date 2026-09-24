import type { EmojiInput, EmojiOptions } from './schema'

/** 一个 Emoji 条目：字符、分类、中文名、搜索关键词 */
export interface EmojiItem {
  readonly char: string
  readonly group: string
  readonly name: string
  readonly keywords: string
}

/**
 * 内置词库。取的是日常高频的一批，按分类组织；
 * 关键词同时给中英文，方便「smile」「笑」两种输入都能命中。
 */
export const EMOJIS: readonly EmojiItem[] = [
  { char: '😀', group: 'face', name: '笑脸', keywords: '笑 smile happy 开心' },
  { char: '😂', group: 'face', name: '笑哭', keywords: '哭 joy tears 笑死' },
  { char: '🤣', group: 'face', name: '笑翻', keywords: 'rofl 爆笑 笑' },
  { char: '😊', group: 'face', name: '微笑', keywords: 'smile 害羞 温暖' },
  { char: '😍', group: 'face', name: '花痴', keywords: 'love heart eyes 喜欢' },
  { char: '😎', group: 'face', name: '墨镜', keywords: 'cool 酷 sunglasses' },
  { char: '🤔', group: 'face', name: '思考', keywords: 'think 想 疑问' },
  { char: '😴', group: 'face', name: '睡觉', keywords: 'sleep 困 睡' },
  { char: '😭', group: 'face', name: '大哭', keywords: 'cry 哭 难过' },
  { char: '😡', group: 'face', name: '生气', keywords: 'angry 怒 rage' },
  { char: '🥳', group: 'face', name: '庆祝', keywords: 'party 生日 庆祝' },
  { char: '🤝', group: 'hand', name: '握手', keywords: 'handshake 合作 deal' },
  { char: '👍', group: 'hand', name: '点赞', keywords: 'thumbs up 赞 好' },
  { char: '👎', group: 'hand', name: '点踩', keywords: 'thumbs down 差 不好' },
  { char: '👏', group: 'hand', name: '鼓掌', keywords: 'clap 掌声 applause' },
  { char: '🙏', group: 'hand', name: '祈祷', keywords: 'pray 感谢 拜托' },
  { char: '👋', group: 'hand', name: '挥手', keywords: 'wave 你好 再见' },
  { char: '✌️', group: 'hand', name: '胜利', keywords: 'victory peace 耶' },
  { char: '✊', group: 'hand', name: '握拳', keywords: 'fist 加油 力量' },
  { char: '🫶', group: 'hand', name: '心形手', keywords: 'heart hands 爱' },
  { char: '🌞', group: 'nature', name: '太阳', keywords: 'sun 晴天 白天' },
  { char: '🌙', group: 'nature', name: '月亮', keywords: 'moon 夜晚 月亮' },
  { char: '⭐', group: 'nature', name: '星星', keywords: 'star 收藏 星' },
  { char: '🌈', group: 'nature', name: '彩虹', keywords: 'rainbow 彩虹' },
  { char: '🔥', group: 'nature', name: '火', keywords: 'fire 热门 hot 火' },
  { char: '💧', group: 'nature', name: '水滴', keywords: 'water drop 水' },
  { char: '🌸', group: 'nature', name: '樱花', keywords: 'blossom flower 花' },
  { char: '🌲', group: 'nature', name: '树', keywords: 'tree 森林 树' },
  { char: '🐶', group: 'nature', name: '狗', keywords: 'dog 宠物 狗' },
  { char: '🐱', group: 'nature', name: '猫', keywords: 'cat 宠物 猫' },
  { char: '🍎', group: 'food', name: '苹果', keywords: 'apple 水果 苹果' },
  { char: '🍜', group: 'food', name: '面', keywords: 'noodle ramen 拉面' },
  { char: '🍚', group: 'food', name: '米饭', keywords: 'rice 饭 米' },
  { char: '🍺', group: 'food', name: '啤酒', keywords: 'beer 酒 干杯' },
  { char: '☕', group: 'food', name: '咖啡', keywords: 'coffee 咖啡 咖啡杯' },
  { char: '🍰', group: 'food', name: '蛋糕', keywords: 'cake 甜点 生日' },
  { char: '⚽', group: 'activity', name: '足球', keywords: 'soccer football 球' },
  { char: '🏀', group: 'activity', name: '篮球', keywords: 'basketball 球 篮球' },
  { char: '🎮', group: 'activity', name: '游戏手柄', keywords: 'game 游戏 手柄' },
  { char: '🎵', group: 'activity', name: '音符', keywords: 'music 音乐 音符' },
  { char: '🏃', group: 'activity', name: '跑步', keywords: 'run 运动 跑' },
  { char: '🚗', group: 'travel', name: '汽车', keywords: 'car 车 开车' },
  { char: '✈️', group: 'travel', name: '飞机', keywords: 'plane 飞行 旅行' },
  { char: '🚀', group: 'travel', name: '火箭', keywords: 'rocket 发射 上线' },
  { char: '🏠', group: 'travel', name: '家', keywords: 'home 房子 家' },
  { char: '🗺️', group: 'travel', name: '地图', keywords: 'map 地图 导航' },
  { char: '💻', group: 'object', name: '笔记本', keywords: 'laptop computer 电脑' },
  { char: '📱', group: 'object', name: '手机', keywords: 'phone mobile 手机' },
  { char: '📚', group: 'object', name: '书', keywords: 'books 书 学习' },
  { char: '🔧', group: 'object', name: '扳手', keywords: 'wrench 工具 修' },
  { char: '💡', group: 'object', name: '灯泡', keywords: 'bulb idea 想法' },
  { char: '🔒', group: 'object', name: '锁', keywords: 'lock 安全 加密' },
  { char: '✅', group: 'symbol', name: '对勾', keywords: 'check 完成 通过' },
  { char: '❌', group: 'symbol', name: '叉', keywords: 'cross 错误 失败' },
  { char: '⚠️', group: 'symbol', name: '警告', keywords: 'warning 注意 警告' },
  { char: '❓', group: 'symbol', name: '问号', keywords: 'question 疑问 问号' },
  { char: '💯', group: 'symbol', name: '满分', keywords: '100 perfect 满分' },
  { char: '❤️', group: 'symbol', name: '红心', keywords: 'heart love 爱 心' },
  { char: '🇨🇳', group: 'flag', name: '中国国旗', keywords: 'china 中国 cn 国旗' },
  { char: '🏁', group: 'flag', name: '终点旗', keywords: 'finish flag 终点' },
  { char: '🚩', group: 'flag', name: '三角旗', keywords: 'flag 旗帜 标记' },
]

/** 按关键词与分类过滤；关键词为空时返回该分类全部 */
export function search(keyword: string, category: string): EmojiItem[] {
  const needle = keyword.trim().toLowerCase()
  return EMOJIS.filter((item) => {
    if (category !== 'all' && item.group !== category) return false
    if (needle === '') return true
    return (
      item.char === keyword.trim() ||
      item.name.includes(needle) ||
      item.keywords.toLowerCase().includes(needle)
    )
  })
}

/** 纯文本版本：每行一个 Emoji，供复制与下载 */
export function emojiText(input: EmojiInput, options: EmojiOptions): string {
  return search(input.text, options.category)
    .map((item) => item.char)
    .join('')
}
