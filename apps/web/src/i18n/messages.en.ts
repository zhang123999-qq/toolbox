/**
 * English copy.
 *
 * Typed as `Record<MessageKey, string>`, so a missing or misspelled key fails
 * typecheck instead of silently falling back to Chinese at runtime.
 * Keys mirror messages.zh.ts one-to-one; wording is rewritten for English
 * rather than translated literally.
 */
import type { MessageKey } from './messages.zh'

export const en: Record<MessageKey, string> = {
  // —— Site ——
  'site.name': 'Toolbox',
  'site.description':
    '870 browser-only tools. Nothing is uploaded and everything keeps working offline. Covers development, design & media, office documents, and everyday categories.',
  'site.localBadge': 'Runs locally · nothing is uploaded',

  // —— Document titles (follow the active language) ——
  'seo.homeTitle': '{name} · {count} browser-only tools',
  'seo.allToolsTitle': 'All tools · {name}',
  'seo.groupTitle': '{group} tools · {name}',
  'seo.categoryTitle': '{category} · {name}',
  'seo.toolTitle': '{tool} · {name}',
  'seo.notFoundTitle': 'Page not found · {name}',

  // —— Common ——
  'common.loading': 'Loading…',

  // —— Header ——
  'nav.groupsLabel': 'Group navigation',
  'nav.allTools': 'All tools',
  'nav.menu': 'Menu',
  'nav.close': 'Close',
  'nav.openMenu': 'Open menu',
  'nav.mobileLabel': 'Mobile navigation',

  // —— Preference controls ——
  'controls.languageLabel': 'Language',
  'controls.themeLabel': 'Theme',
  'controls.themeToLight': 'Switch to light theme',
  'controls.themeToDark': 'Switch to dark theme',
  'controls.langZh': 'Chinese',
  'controls.langEn': 'English',

  // —— Search ——
  'search.open': 'Search',
  'search.dialogLabel': 'Search tools',
  'search.placeholder': 'Search tools by title, tag or description',
  'search.empty': 'No matches',
  'search.hint': 'Type a keyword to start searching',
  'search.close': 'Close search',

  // —— Home · hero ——
  'hero.eyebrow': 'Local-only · No sign-up · Works offline',
  'hero.titleLead': '{count} online tools,',
  'hero.titleTail': 'all running inside your browser',
  'hero.subtitle':
    'Text processing, encoding conversion, image editing, PDF work, math… Open and go. No sign-up, no uploads, and it still works when you are offline.',
  'hero.ctaPrimary': 'Browse all tools',
  'hero.ctaSecondary': 'Try the JSON formatter',
  'hero.searchHintBefore': 'Press',
  'hero.searchHintMiddle': 'or',
  'hero.searchHintAfter': 'to search from anywhere',
  'hero.imageAlt': 'Product hero placeholder illustration',
  'hero.stat.planned': 'Planned',
  'hero.stat.live': 'Live',
  'hero.stat.categories': 'Categories',
  'hero.stat.groups': 'Groups',

  // —— Home · highlights ——
  'highlights.title': 'Why use it',
  'highlights.local.title': 'Nothing is uploaded',
  'highlights.local.body':
    'Every computation happens in your browser. Your input never leaves the machine and is never written to any server log.',
  'highlights.noSignup.title': 'No sign-up required',
  'highlights.noSignup.body':
    'Open a page and start working. No registration, no quotas, no account to link.',
  'highlights.offline.title': 'Works offline',
  'highlights.offline.body':
    'Core tools make no network calls, so they keep working on a plane, on a train, or with the Wi-Fi off.',
  'highlights.coverage.title': 'Covers {count} categories',
  'highlights.coverage.body':
    'From text, encoding and data formats to images, PDF, math and education — grouped by category so you never have to dig through menus.',

  // —— Home · groups ——
  'groups.title': 'Browse by group',
  'groups.summary': '{tools} tools · {categories} categories',

  // —— Home · categories ——
  'categories.title': 'All {count} categories',
  'categories.viewAll': 'View all',
  'categories.count': '{count} tools',

  // —— Home · featured tools ——
  'featured.title': 'Live tools',
  'featured.stage': 'Stage 0: {live} / {planned} ({percent}%)',
  'featured.progressLabel': 'Tool build progress',

  // —— Home · closing CTA ——
  'cta.title': 'Start using it — no sign-up first',
  'cta.body': 'Placeholder copy: typical use cases and a getting-started path go here.',
  'cta.primary': 'Open the tool list',
  'cta.secondary': 'Start with development tools',

  // —— All tools page ——
  'allTools.title': 'All tools',

  // —— Group page ——
  'groupPage.unknown': 'Unknown group: {group}',
  'groupPage.summary': '{tools} planned · #{from}–{to}',

  // —— Category page ——
  'categoryPage.unknown': 'Unknown category: {category}',
  'categoryPage.summary': '#{from}–{to} · {tools} tools planned',
  'categoryPage.mismatch':
    'This category belongs to the "{expected}" group, but the URL uses "{actual}".',
  'categoryPage.empty': 'No tools implemented in this category yet ({tools} planned).',
  'categoryPage.viewAll': 'Browse all live tools →',

  // —— Tool page ——
  'toolPage.notFoundTitle': 'Tool not found',
  'toolPage.notFoundBody': 'Nothing found for {slug}; it may not be implemented yet.',
  'toolPage.notImplemented': 'Registered in the catalog, but its Tool.tsx is not implemented yet.',

  // —— Breadcrumb ——
  'breadcrumb.label': 'Breadcrumb',
  'breadcrumb.home': 'Home',

  // —— Tool shell notices ——
  'tool.apiNoticeTitle': 'This tool calls an external service',
  'tool.apiNoticeBody':
    'Bring your own API key. Your input is sent to a third party. We never hold your keys and never store your data.',

  // —— Templates & actions ——
  'tool.input': 'Input',
  'tool.inputPlaceholder': 'Paste your content here…',
  'tool.run': 'Run',
  'tool.example': 'Example',
  'tool.clear': 'Clear',
  'tool.output': 'Output',
  'tool.empty': '(empty)',
  'tool.copy': 'Copy',
  'tool.copied': 'Copied',
  'tool.download': 'Download',

  // —— Tool options ——
  // Shared option labels: reused by many tools so each tool needs no dedicated keys
  'option.mode': 'Mode',
  'option.sortKeys': 'Sort keys',
  // Shared option labels prepared for the rollout; reused across text, encoding and conversion tools
  'option.countSpaces': 'Count spaces',
  'option.speed': 'Speed',
  'option.topN': 'Top N',
  'option.ignoreCase': 'Ignore case',
  'option.useStopWords': 'Filter stop words',
  'option.mask': 'Mask hits',
  'option.delimiter': 'Delimiter',
  'option.target': 'Target',
  'option.type': 'Type',
  'option.style': 'Style',
  'option.width': 'Width',
  'option.length': 'Length',
  'option.pattern': 'Pattern',
  'option.replacement': 'Replace with',
  'option.direction': 'Direction',
  'option.language': 'Language',
  'option.encoding': 'Encoding',
  'option.algorithm': 'Algorithm',
  'option.level': 'Level',
  'option.prefix': 'Prefix',
  'option.suffix': 'Suffix',
  'option.keepEmpty': 'Keep blank lines',
  'option.trimLines': 'Trim lines',
  'option.useRegex': 'Use regex',
  'option.charset': 'Charset',
  'option.format': 'Format',
  'option.unit': 'Unit',
  'option.sortBy': 'Sort by',
  'option.descending': 'Descending',
  'option.indent': 'Indent',
  'option.columns': 'Columns',
  'option.showLineNumbers': 'Show line numbers',
  'option.minLength': 'Min length',
  'option.padChar': 'Pad character',
  'option.align': 'Alignment',
  'jsonFormatter.option.indent': 'Indent',
  'jsonFormatter.option.sortKeys': 'Sort keys',

  // —— 404 ——
  'notFound.body': 'This page does not exist.',
  'notFound.back': 'Back to home',

  // —— Footer ——
  'footer.byGroup': 'By group',
  'footer.popularCategories': 'Popular categories',
  'footer.copyright': '© {year} {name} · placeholder copy, to be replaced',

  // —— 4 groups ——
  'group.dev.name': 'Development',
  'group.dev.desc': 'Text, encoding, data formats, DevOps, time, network',
  'group.design.name': 'Design & Media',
  'group.design.desc': 'Generators, images, audio & video, visualization, games',
  'group.office.name': 'Office',
  'group.office.desc': 'PDF and Office document processing',
  'group.life.name': 'Life & Learning',
  'group.life.desc': 'Math, AI, Web3, accessibility, automation, extensions, edge, education',

  // —— 20 categories ——
  'category.text.name': 'Text & Content',
  'category.encoding.name': 'Encoding, Crypto & Security',
  'category.data-format.name': 'Data Formats & Parsing',
  'category.devops.name': 'DevOps & Cloud Native',
  'category.datetime.name': 'Date, Time & Scheduling',
  'category.math.name': 'Math, Units & Finance',
  'category.random.name': 'Random & Generators',
  'category.image.name': 'Images & Graphics',
  'category.pdf.name': 'PDF & Office Documents',
  'category.media.name': 'Audio & Video',
  'category.ai.name': 'AI & LLM',
  'category.seo.name': 'Web, SEO & Sites',
  'category.visualization.name': 'Data Visualization',
  'category.web3.name': 'Web3 & Blockchain',
  'category.a11y.name': 'Accessibility & i18n',
  'category.automation.name': 'Automation, API & Testing',
  'category.extension.name': 'Browser Extensions & Userscripts',
  'category.game.name': 'Game Dev & Pixel Art',
  'category.edge.name': 'Edge Computing & Serverless',
  'category.education.name': 'Education & Fun',

  // —— Feasibility labels ——
  'feasibility.A': 'Pure JS',
  'feasibility.B': 'WASM',
  'feasibility.C': 'Web API',
  'feasibility.D': 'Bring your own key',
  'feasibility.E': 'Needs a backend',
}
