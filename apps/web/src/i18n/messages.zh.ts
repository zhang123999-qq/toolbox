/**
 * 中文文案真源（i18n key 的唯一定义处）
 *
 * 约定：
 *  1. 扁平 key，冒号分命名空间（`hero.titleLead`、`category.text.name`）。
 *  2. 插值统一用 `{name}` 形式，由 createTranslator 负责替换。
 *  3. **本文件是 key 的类型真源**：`MessageKey` 由它推导，
 *     messages.en.ts 声明为 `Record<MessageKey, string>`，
 *     因此漏译任何一个 key 都会在 typecheck 阶段报错。
 *  4. 组名 / 域名 / 可行性标签也在 i18n 层（而非 catalog），
 *     让「所有可见文案」集中在一处；catalog 保持纯数据。
 *     用 `t(`group.${id}.name`)` 这类模板字面量取用时仍受类型检查。
 */
export const zh = {
  // —— 站点级 ——
  'site.name': '工具库',
  'site.description':
    '870 个纯前端在线工具，数据不上传、可离线使用。覆盖开发编码、设计媒体、办公文档、生活学习四大类。',
  'site.localBadge': '纯本地处理 · 数据不上传',

  // —— 文档标题（随语言切换）——
  'seo.homeTitle': '{name} · {count} 个纯本地在线工具',
  'seo.allToolsTitle': '全部工具 · {name}',
  'seo.groupTitle': '{group}工具 · {name}',
  'seo.categoryTitle': '{category} · {name}',
  'seo.toolTitle': '{tool} · {name}',
  'seo.notFoundTitle': '页面不存在 · {name}',

  // —— 通用 ——
  'common.loading': '加载中…',

  // —— 顶部导航 ——
  'nav.groupsLabel': '大组导航',
  'nav.allTools': '全部工具',
  'nav.menu': '菜单',
  'nav.close': '关闭',
  'nav.openMenu': '打开菜单',
  'nav.mobileLabel': '移动端导航',

  // —— 偏好控件 ——
  'controls.languageLabel': '语言切换',
  'controls.themeLabel': '主题切换',
  'controls.themeToLight': '切换到浅色主题',
  'controls.themeToDark': '切换到深色主题',
  'controls.langZh': '中文',
  'controls.langEn': 'English',

  // —— 搜索 ——
  'search.open': '搜索',
  'search.dialogLabel': '搜索工具',
  'search.placeholder': '搜索工具（支持标题、标签、描述）',
  'search.empty': '无匹配结果',
  'search.hint': '输入关键词开始搜索',

  // —— 首页 · 主视觉 ——
  'hero.eyebrow': '纯本地 · 免登录 · 可离线',
  'hero.titleLead': '{count} 个在线工具，',
  'hero.titleTail': '全部在你的浏览器里跑',
  'hero.subtitle':
    '文本处理、编码转换、图片编辑、PDF 操作、数学计算……打开即用，不注册、不上传，断网也能继续干活。',
  'hero.ctaPrimary': '浏览全部工具',
  'hero.ctaSecondary': '试试 JSON 格式化',
  'hero.searchHintBefore': '按',
  'hero.searchHintMiddle': '或',
  'hero.searchHintAfter': '随时全局搜索',
  'hero.imageAlt': '产品主视觉占位图',
  'hero.stat.planned': '规划工具',
  'hero.stat.live': '已上线',
  'hero.stat.categories': '分类域',
  'hero.stat.groups': '大组',

  // —— 首页 · 核心亮点 ——
  'highlights.title': '为什么用它',
  'highlights.local.title': '数据不上传',
  'highlights.local.body':
    '所有计算都在你的浏览器里完成，输入内容不会离开本机，也不会写入任何服务端日志。',
  'highlights.noSignup.title': '免登录即用',
  'highlights.noSignup.body':
    '打开页面就能用，没有注册流程、没有配额限制，也不要求绑定任何账号。',
  'highlights.offline.title': '可离线使用',
  'highlights.offline.body':
    '核心工具不依赖网络请求，装到桌面或断网环境下依然可以正常干活。',
  'highlights.coverage.title': '覆盖 {count} 个域',
  'highlights.coverage.body':
    '从文本、编码、数据格式到图片、PDF、数学与教育，按域归类，找工具不用翻菜单。',

  // —— 首页 · 大组展示 ——
  'groups.title': '按分类浏览',
  'groups.summary': '{tools} 个工具 · {categories} 个域',

  // —— 首页 · 域速览 ——
  'categories.title': '全部 {count} 个域',
  'categories.viewAll': '查看全部',
  'categories.count': '{count} 个',

  // —— 首页 · 已上线工具 ——
  'featured.title': '已上线工具',
  'featured.stage': '阶段 0：{live} / {planned}（{percent}%）',
  'featured.progressLabel': '工具建设进度',

  // —— 首页 · 底部转化 ——
  'cta.title': '直接开始用，不用先注册',
  'cta.body': '占位文案：这里将补充说明典型使用场景与上手路径。',
  'cta.primary': '进入工具列表',
  'cta.secondary': '先看开发编码类',

  // —— 全部工具页 ——
  'allTools.title': '全部工具',

  // —— 大组页 ——
  'groupPage.unknown': '未知大组：{group}',
  'groupPage.summary': '规划 {tools} 个 · 编号 {from}–{to}',

  // —— 域页 ——
  'categoryPage.unknown': '未知分类：{category}',
  'categoryPage.summary': '编号 {from}–{to} · 规划 {tools} 个工具',
  'categoryPage.mismatch': '该分类属于「{expected}」组，当前 URL 使用的是「{actual}」。',
  'categoryPage.empty': '该分类下暂无已实现工具（规划 {tools} 个）。',
  'categoryPage.viewAll': '查看全部已上线工具 →',

  // —— 工具页 ——
  'toolPage.notFoundTitle': '工具不存在',
  'toolPage.notFoundBody': '未找到 {slug}，它可能尚未实现。',
  'toolPage.notImplemented': '该工具已在 catalog 注册，但 Tool.tsx 尚未实现。',

  // —— 面包屑 ——
  'breadcrumb.label': '面包屑',
  'breadcrumb.home': '首页',

  // —— 工具壳提示 ——
  'tool.apiNoticeTitle': '此工具请求外部服务',
  'tool.apiNoticeBody':
    '需你自备 API / Key，输入数据会发送至第三方。本站不代管密钥，也不存储你的数据。',

  // —— 模板与操作 ——
  'tool.input': '输入',
  'tool.inputPlaceholder': '在此粘贴内容…',
  'tool.run': '运行',
  'tool.example': '示例',
  'tool.clear': '清空',
  'tool.output': '输出',
  'tool.empty': '（空）',
  'tool.copy': '复制',
  'tool.copied': '已复制',
  'tool.download': '下载',

  // —— 工具内选项 ——
  'jsonFormatter.option.indent': '缩进',
  'jsonFormatter.option.sortKeys': '排序键名',

  // —— 404 ——
  'notFound.body': '页面不存在。',
  'notFound.back': '返回首页',

  // —— 页脚 ——
  'footer.byGroup': '按分类',
  'footer.popularCategories': '热门域',
  'footer.copyright': '© {year} {name} · 内容为占位文案，待替换',

  // —— 4 大组 ——
  'group.dev.name': '开发编码',
  'group.dev.desc': '文本、编码、数据格式、运维、时间、网络',
  'group.design.name': '设计媒体',
  'group.design.desc': '随机设计、图片、音视频、可视化、游戏',
  'group.office.name': '办公文档',
  'group.office.desc': 'PDF 与 Office 文档处理',
  'group.life.name': '生活学习',
  'group.life.desc': '数学、AI、Web3、无障碍、自动化、扩展、边缘、教育',

  // —— 20 个域 ——
  'category.text.name': '文本与内容处理',
  'category.encoding.name': '编码 / 加密 / 安全',
  'category.data-format.name': '数据格式 / 解析',
  'category.devops.name': '开发 / 运维 / 云原生',
  'category.datetime.name': '时间 / 日期 / 调度',
  'category.math.name': '数学 / 单位 / 金融',
  'category.random.name': '随机 / 生成 / 设计',
  'category.image.name': '图片 / 图形',
  'category.pdf.name': 'PDF / Office / 文档',
  'category.media.name': '音视频 / 媒体',
  'category.ai.name': 'AI / LLM',
  'category.seo.name': '网络 / SEO / 网站',
  'category.visualization.name': '数据可视化',
  'category.web3.name': 'Web3 / 区块链',
  'category.a11y.name': '无障碍 / 国际化',
  'category.automation.name': '自动化 / API / 测试',
  'category.extension.name': '浏览器扩展 / 油猴',
  'category.game.name': '游戏开发 / 像素',
  'category.edge.name': '边缘计算 / Serverless',
  'category.education.name': '教育 / 学习 / 趣味',

  // —— 可行性标签 ——
  'feasibility.A': '纯 JS',
  'feasibility.B': 'WASM',
  'feasibility.C': 'Web API',
  'feasibility.D': '需自备 API/Key',
  'feasibility.E': '需后端',
} satisfies Record<string, string>

/** 文案 key 的联合类型（由中文真源推导，新增 key 会自动进入该类型） */
export type MessageKey = keyof typeof zh
