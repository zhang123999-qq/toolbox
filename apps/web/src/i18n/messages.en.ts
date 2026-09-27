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
  'tool.textA': 'Original',
  'tool.textB': 'Revised',
  'tool.otherText': 'Other text',
  'tool.running': 'Calling…',
  'tool.asyncIdle': 'Fill in the API settings, then click Run',
  'tool.password': 'Password',
  'tool.watermark': 'Watermark',
  'tool.noMatch': 'No match, try another keyword',
  'tool.picked': 'Picked',
  'tool.apiBase': 'Base URL',
  'tool.apiKey': 'API Key',
  'tool.model': 'Model',
  'tool.textMine': 'Mine',
  'tool.textTheirs': 'Theirs',
  'tool.file': 'Choose a file (optional)',
  'tool.proxy': 'Proxy / probe endpoint (self-hosted)',
  'tool.kValue': 'k (leave blank = n)',

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
  'option.filler': 'Filler',
  'option.ellipsis': 'Ellipsis',
  'option.algorithm': 'Algorithm',
  'option.uppercase': 'Uppercase',
  'option.steps': 'Pipeline steps',
  'option.rate': 'Rate',
  'option.level': 'Error correction',
  'option.breakLong': 'Break long words',
  'option.trim': 'Trim before comparing',
  'option.length': 'Length',
  'option.limit': 'Limit',
  'option.metric': 'Metric',
  'option.category': 'Category',
  'option.pattern': 'Pattern',
  'option.replacement': 'Replace with',
  'option.direction': 'Direction',
  'option.language': 'Language',
  'option.encoding': 'Encoding',
  'option.prefix': 'Prefix',
  'option.suffix': 'Suffix',
  'option.keepEmpty': 'Keep blank lines',
  'option.trimLines': 'Trim lines',
  'option.useRegex': 'Use regex',
  'option.sample': 'Sample mode (denominator n−1)',
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
  'option.tone': 'Tone',
  'option.breaks': 'Line breaks to <br>',
  'option.keepLineBreaks': 'Keep line breaks',
  'option.strict': 'Strict mode',
  'option.keepOrder': 'Keep order',
  'option.reverse': 'Reverse',
  'option.header': 'First row is header',
  'option.separator': 'Separator',
  'option.chinese': 'Chinese handling',
  'option.lowercase': 'Lowercase',
  'option.syntax': 'Placeholder syntax',
  'option.keepMissing': 'Keep missing placeholders',
  'option.count': 'Count',
  'option.stable': 'Reproducible (seed from content)',
  'option.skipEmpty': 'Skip empty lines',
  'option.global': 'Replace all',
  'option.multiline': 'Multiline',
  'option.ignoreWhitespace': 'Ignore whitespace',
  'option.preview': 'Preview decoded text',
  'option.prefer': 'On conflict prefer',
  'option.joiner': 'Joiner',
  'option.skipMissing': 'Skip missing columns',
  // —— Shared options for the math domain (06) ——
  'option.operation': 'Operation',
  'option.shape': 'Shape',
  'option.angleUnit': 'Angle unit',
  'option.function': 'Function',
  'extra.secondNumber': 'Second number (integer)',
  'extra.matrixB': 'Matrix B (for + / − / ×)',
  'extra.base': 'Base (for custom base)',
  'extra.min': 'Min',
  'extra.max': 'Max',
  'extra.decimals': 'Decimals',
  'extra.annualRate': 'Annual rate (%)',
  'extra.years': 'Term (years)',
  'extra.termYears': 'Term (years)',
  'extra.taxRate': 'Tax rate (%)',
  'extra.discountRate': 'Discount (%)',
  'extra.quantity': 'Quantity',
  'option.unique': 'Unique',
  'option.repayMethod': 'Repayment method',
  'option.compoundFreq': 'Compounding frequency',
  'option.interestType': 'Interest type',
  'option.taxDirection': 'Price type',
  'option.keepCommon': 'Keep common whitespace',
  'option.collapse': 'Collapse repeated whitespace',
  // —— Random sampling #369 / numeric precision #370 ——
  'sampling.extra.sampleSize': 'Sample size',
  'sampling.extra.seed': 'Random seed (blank = true random)',
  'sampling.option.replace': 'Sample with replacement',
  'sampling.mode': 'Sampling mode',
  'sampling.mode.withReplacement': 'With replacement',
  'sampling.mode.withoutReplacement': 'Without replacement',
  'sampling.population': 'Population size',
  'sampling.size': 'Sample size',
  'sampling.seed': 'Seed',
  'sampling.seed.random': 'True random',
  'sampling.result': 'Sample result',
  'sampling.error.sizeEmpty': 'Please enter the sample size',
  'sampling.error.sizeNotNumber': 'Invalid sample size: {value} (must be a number)',
  'sampling.error.sizeNotInteger': 'Sample size must be an integer: {value}',
  'sampling.error.sizeNegative': 'Sample size cannot be negative',
  'sampling.error.sizeTooLarge': 'Sample size too large (max {max})',
  'sampling.error.exceedsPopulation':
    'Without replacement, sample size ({size}) cannot exceed population size ({population})',
  'precision.extra.secondNumber': 'Second number',
  'precision.option.operator': 'Operator',
  'precision.expr': 'Expression',
  'precision.exact': 'Exact result (decimal.js)',
  'precision.float': 'Native JS float result',
  'precision.diff': 'Error (JS − exact)',
  'precision.verdict.match': 'Verdict: identical — no floating-point error',
  'precision.verdict.mismatch':
    'Verdict: floating-point error present — use the decimal.js value for money and science',
  'precision.error.invalidNumber': 'Invalid number: {value} (must be a number)',
  'precision.error.divideByZero': 'Division by zero',
  'option.removeEmpty': 'Remove empty lines',
  'option.source': 'Source language',
  // —— Encoding / crypto domain (02) shared options ——
  'option.key': 'Key',
  'option.secret': 'Key / passphrase',
  'option.iv': 'Initialization vector (IV)',
  'option.salt': 'Salt',
  'option.iterations': 'Iterations',
  'option.password': 'Password',
  'option.period': 'Period (seconds)',
  'option.digits': 'Digits',
  'option.words': 'Words',
  'option.blocks': 'Block size',
  'option.padding': 'Padding',
  'option.endian': 'Byte order',
  'option.url': 'Target URL',
  'option.timeout': 'Timeout (ms)',
  'option.memory': 'Memory cost (KiB)',
  'option.parallelism': 'Parallelism',
  'option.curve': 'Curve',
  'option.bits': 'Length (bits)',
  'option.errorLevel': 'Error correction level',
  'option.noAmbiguous': 'Exclude ambiguous characters',
  'option.eachClass': 'At least one per class',
  'option.includeLower': 'Include lowercase',
  'option.includeUpper': 'Include uppercase',
  'option.includeNumbers': 'Include digits',
  'option.includeSymbols': 'Include symbols',
  'option.withHeader': 'Include header row',
  'option.quote': 'Quote style',
  'option.method': 'Mode',
  'option.age': 'Validity',
  'option.publicKey': 'Public key (PEM)',
  'option.privateKey': 'Private key (PEM)',
  'option.signature': 'Signature',
  'option.issuer': 'Issuer',
  'option.account': 'Account',
  'option.counter': 'Counter',
  'option.payload': 'Payload',
  'option.subject': 'Subject',
  'option.days': 'Validity (days)',
  'option.cost': 'Cost factor',
  'option.recipient': 'Recipient public key',
  'option.origin': 'Origin',
  'option.hash': 'Hash to verify',
  'option.commonName': 'Common name (CN)',
  'option.organization': 'Organization (O)',
  'option.country': 'Country (C, 2 letters)',
  'option.organizationalUnit': 'Organizational unit (OU)',
  'option.keySize': 'Key size',
  'option.altNames': 'Subject alt names (SAN, comma-separated)',
  'option.includePrivateKey': 'Also output private key',
  'option.credentials': 'Send credentials (Cookie)',
  'option.dialect': 'SQL dialect',
  'option.rootName': 'Root element name',
  'option.xmlDeclaration': 'Include XML declaration',
  'jsonFormatter.option.indent': 'Indent',
  'jsonFormatter.option.sortKeys': 'Sort keys',
  'percentage.input.b': 'Second number B',
  'ratio.input.b': 'Second value',
  'fraction.option.decimals': 'Decimal places',
  'average.option.decimals': 'Decimal places',
  'median.option.decimals': 'Decimal places',

  // —— Number format (#366) ——
  'numberFormat.option.mode': 'Format mode',
  'numberFormat.option.grouping': 'Thousands separator',
  'numberFormat.option.decimals': 'Decimal places',
  'numberFormat.error.tooLong': 'Input exceeds the 200,000 character limit',
  'numberFormat.error.invalid': 'Not a valid number: {value}',

  // —— Statistics chart (#367) ——
  'statistics.option.chart': 'Chart type',
  'statistics.option.decimals': 'Decimal places',
  'statistics.error.tooLong': 'Input exceeds the 200,000 character limit',
  'statistics.error.noData': 'No valid numbers found',
  'statistics.error.invalidLine': 'Line {line} is not valid data: {value}',
  'statistics.chart.title': 'Data distribution',
  'statistics.chart.value': 'Value',
  'statistics.summary.count': 'Count',
  'statistics.summary.sum': 'Sum',
  'statistics.summary.mean': 'Mean',
  'statistics.summary.min': 'Min',
  'statistics.summary.max': 'Max',

  // —— Probability (#368) ——
  'probability.option.mode': 'Mode',
  'probability.option.decimals': 'Decimal places',
  'probability.error.tooLong': 'Input exceeds the 200,000 character limit',
  'probability.error.unknownKey': 'Unknown parameter: {key}',
  'probability.error.missingParam': 'Missing parameter: {key}',
  'probability.error.notNumber': 'Parameter {key} is not a valid number: {value}',
  'probability.error.badN': 'n (number of trials) must be a non-negative integer',
  'probability.error.badK': 'k (number of successes) must be a non-negative integer',
  'probability.error.badP': 'p (success probability) must be between 0 and 1',
  'probability.error.probRange': 'Probability must be between 0 and 1: {key}={value}',
  'probability.error.badSigma': 'σ (standard deviation) must be greater than 0',
  'probability.error.zeroDenominator': 'Denominator is 0, conditional probability is undefined',
  'probability.hint.binomial': 'One parameter per line, e.g.:\nn=10\nk=3\np=0.5',
  'probability.hint.conditional': 'One parameter per line, e.g.:\npa=0.6\npb=0.4\npab=0.24',
  'probability.hint.normal': 'One parameter per line, e.g.:\nx=1.96\nmu=0\nsigma=1',
  'probability.label.pmf': 'P(X = k)',
  'probability.label.cdfLe': 'P(X ≤ k)',
  'probability.label.cdfGe': 'P(X ≥ k)',
  'probability.label.mean': 'Mean E[X]',
  'probability.label.variance': 'Variance Var(X)',
  'probability.label.condAB': 'P(A|B)',
  'probability.label.condBA': 'P(B|A)',
  'probability.label.independent': 'Are A and B independent',
  'probability.label.yes': 'Yes',
  'probability.label.no': 'No',
  'probability.label.normalCdf': 'P(X ≤ x)',
  'probability.label.normalPdf': 'f(x) density',
  'probability.label.tail': 'P(X > x)',

  // —— Due date (#360) ——
  'extra.cycleLength': 'Cycle length (days, default 28)',
  'extra.refDate': 'Reference date (blank = today)',
  'dueDate.error.tooLong': 'Input exceeds the 200,000 character limit',
  'dueDate.error.emptyDate': 'Please enter the last menstrual period date',
  'dueDate.error.invalidDate': 'Cannot parse date: {value} (use YYYY-MM-DD)',
  'dueDate.error.dateOutOfRange': 'Date out of range: {value}',
  'dueDate.error.refBeforeLmp': 'Reference date is before the last menstrual period date',
  'dueDate.error.invalidCycle': 'Invalid cycle length: {value} (must be a positive integer)',
  'dueDate.error.cycleOutOfRange': 'Cycle length out of range: {value} days (expected {min}–{max})',
  'dueDate.label.lmp': 'Last menstrual period',
  'dueDate.label.cycleLength': 'Cycle length',
  'dueDate.label.edd': 'Estimated due date',
  'dueDate.label.gestationalAge': 'Gestational age',
  'dueDate.label.daysLeft': 'Days to due date',
  'dueDate.label.trimester': 'Trimester',
  'dueDate.text.gestationalAge': '{weeks} weeks {days} days',
  'dueDate.text.daysLeft': '{days} days left',
  'dueDate.text.overdue': '{days} days past the due date',
  'dueDate.text.cycleAdjusted': 'Adjusted {adjustment} days for a {cycle}-day cycle',
  'dueDate.unit.days': '{days} days',
  'dueDate.trimester.first': 'First trimester',
  'dueDate.trimester.second': 'Second trimester',
  'dueDate.trimester.third': 'Third trimester',

  // —— Ovulation (#361) ——
  'ovulation.error.tooLong': 'Input exceeds the 200,000 character limit',
  'ovulation.error.emptyDate': 'Please enter the last menstrual period date',
  'ovulation.error.invalidDate': 'Cannot parse date: {value} (use YYYY-MM-DD)',
  'ovulation.error.dateOutOfRange': 'Date out of range: {value}',
  'ovulation.error.refBeforeLmp': 'Reference date is before the last menstrual period date',
  'ovulation.error.invalidCycle': 'Invalid cycle length: {value} (must be a positive integer)',
  'ovulation.error.cycleOutOfRange':
    'Cycle length out of range: {value} days (expected {min}–{max})',
  'ovulation.label.lmp': 'Last menstrual period',
  'ovulation.label.cycleLength': 'Cycle length',
  'ovulation.label.ovulationDate': 'Ovulation day',
  'ovulation.label.fertileWindow': 'Fertile window',
  'ovulation.label.nextPeriod': 'Next period (estimated)',
  'ovulation.label.phase': 'Current phase',
  'ovulation.label.daysToOvulation': 'Days to ovulation',
  'ovulation.text.daysToOvulation': 'in {days} days',
  'ovulation.text.ovulationToday': 'today',
  'ovulation.text.ovulationPassed': '{days} days ago',
  'ovulation.text.fertileRange': '{start} – {end}',
  'ovulation.text.cycleDay': 'Day {day}',
  'ovulation.phase.menstrual': 'Menstrual phase',
  'ovulation.phase.follicular': 'Follicular phase',
  'ovulation.phase.fertile': 'Fertile window',
  'ovulation.phase.luteal': 'Luteal phase',
  'ovulation.warn.abnormalCycle':
    'Note: cycle is {cycle} days, outside the typical range (21–35 days); results are indicative only',

  // —— Blood type compatibility (#362) ——
  'bloodType.error.tooLong': 'Input exceeds the 200,000 character limit',
  'bloodType.error.invalid': 'Unrecognized blood type: {value} (e.g. A+, O-, AB)',
  'bloodType.label.recipient': 'Recipient',
  'bloodType.label.donorsRbc': 'Compatible red-cell donors',
  'bloodType.label.recipientsRbc': 'Can donate red cells to',
  'bloodType.label.donorsPlasma': 'Compatible plasma donors',
  'bloodType.label.recipientsPlasma': 'Can donate plasma to',
  'bloodType.note.plasma':
    'Note: plasma compatibility is the reverse of red-cell compatibility; AB plasma is the universal donor.',

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

  // —— Zodiac match (#363) ——
  'zodiacMatch.you': 'Your sign',
  'zodiacMatch.partner': "Partner's sign",
  'zodiacMatch.nameA': 'Your name (optional)',
  'zodiacMatch.nameB': "Partner's name (optional)",
  'zodiacMatch.pair': 'Pairing',
  'zodiacMatch.score': 'Compatibility score',
  'zodiacMatch.elements': 'Element pairing',
  'zodiacMatch.verdict': 'Verdict',
  'zodiacMatch.analysis': 'Pairing notes',
  'zodiacMatch.advice': 'Advice',
  'zodiacMatch.element.fire': 'Fire',
  'zodiacMatch.element.earth': 'Earth',
  'zodiacMatch.element.air': 'Air',
  'zodiacMatch.element.water': 'Water',
  'zodiacMatch.sign.aries': 'Aries (白羊座)',
  'zodiacMatch.sign.taurus': 'Taurus (金牛座)',
  'zodiacMatch.sign.gemini': 'Gemini (双子座)',
  'zodiacMatch.sign.cancer': 'Cancer (巨蟹座)',
  'zodiacMatch.sign.leo': 'Leo (狮子座)',
  'zodiacMatch.sign.virgo': 'Virgo (处女座)',
  'zodiacMatch.sign.libra': 'Libra (天秤座)',
  'zodiacMatch.sign.scorpio': 'Scorpio (天蝎座)',
  'zodiacMatch.sign.sagittarius': 'Sagittarius (射手座)',
  'zodiacMatch.sign.capricorn': 'Capricorn (摩羯座)',
  'zodiacMatch.sign.aquarius': 'Aquarius (水瓶座)',
  'zodiacMatch.sign.pisces': 'Pisces (双鱼座)',
  'zodiacMatch.tier.5': 'A match made in heaven',
  'zodiacMatch.tier.4': 'Highly compatible',
  'zodiacMatch.tier.3': 'Quite compatible',
  'zodiacMatch.tier.2': 'Needs some work',
  'zodiacMatch.tier.1': 'Quite challenging',
  'zodiacMatch.combo.air-air':
    'Air × Air: two minds that never run out of things to talk about; make sure ideas turn into action.',
  'zodiacMatch.combo.air-earth':
    'Air × Earth: one dreams big, the other keeps it real; air brings fresh perspective, earth keeps things grounded.',
  'zodiacMatch.combo.air-fire':
    'Air × Fire: fire burns brighter with air; a doer plus an ideas person is lively and effective.',
  'zodiacMatch.combo.air-water':
    'Air × Water: head meets heart; air should learn to hold water’s feelings, water should learn to say them out loud.',
  'zodiacMatch.combo.earth-earth':
    'Earth × Earth: two pragmatists, rock solid; remember to surprise each other now and then.',
  'zodiacMatch.combo.earth-fire':
    'Fire × Earth: one charges ahead, one holds steady; learn to appreciate each other’s pace.',
  'zodiacMatch.combo.earth-water':
    'Earth × Water: water nourishes earth, earth carries water; one of the most secure pairings, growing better with time.',
  'zodiacMatch.combo.fire-fire':
    'Fire × Fire: double the passion and drive; neither likes to lose, so cool down before arguing.',
  'zodiacMatch.combo.fire-water':
    'Fire × Water: steam or harmony; fire should soften the bluntness, water’s feelings deserve to be taken seriously.',
  'zodiacMatch.combo.water-water':
    'Water × Water: emotional resonance at full strength; agree in advance who reaches out first when both feel low.',
  'zodiacMatch.advice.5':
    'Keep it going and make more memories together; even great matches need care.',
  'zodiacMatch.advice.4':
    'You already click well; when you disagree, affirm each other first, then talk differences.',
  'zodiacMatch.advice.3':
    'Mostly in sync with occasional friction; say “let’s” instead of “you should” and things smooth out.',
  'zodiacMatch.advice.2':
    'Differences are where complementing begins; trade “should” for curiosity and the bond deepens.',
  'zodiacMatch.advice.1':
    'Bigger challenges, bigger growth; start as friends, give each other patience and space.',
  'zodiacMatch.error.unknownSign': 'Unknown zodiac sign: {sign}',

  // —— Exchange rate (#364) / Currency (#365) shared ——
  'error.invalidAmount': 'Invalid amount: {value} (must be a finite number)',
  'error.unknownCurrency': 'Unknown currency code: {code}',

  // —— Exchange rate (#364) ——
  'exchangeRate.from': 'From currency',
  'exchangeRate.to': 'To currency',
  'exchangeRate.idle': 'Enter an amount and your API key, then click Run',
  'exchangeRate.error.missingApiKey':
    'Please enter your API key first: this tool needs your own exchange-rate API key. The key stays in this page’s input and is never uploaded.',
  'exchangeRate.error.negativeAmount': 'Amount cannot be negative',
  'exchangeRate.error.httpError': 'Exchange-rate API returned {status}; please check your API key',
  'exchangeRate.error.networkError': 'Network request failed; check your connection and retry',
  'exchangeRate.error.apiError': 'Exchange-rate API error: {info}',
  'exchangeRate.error.badResponse': 'The API returned an unparseable response',

  // —— Currency (#365) ——
  'currency.currency': 'Currency',
  'currency.locale': 'Locale',
  'currency.display': 'Display',
  'currency.decimals': 'Decimals',
  'currency.error.unknownLocale': 'Unknown locale: {code}',
  'currency.error.unknownDisplay': 'Unknown display mode: {value}',
  'currency.error.invalidDecimals': 'Invalid decimals: {value}',
  'currency.error.formatFailed': 'Formatting failed; check the currency and locale options',

  // —— Export PNG (shared by #405–#409) ——
  'export.png': 'Export PNG',
  'export.exporting': 'Exporting…',
  'export.failed': 'Export failed: {reason}',

  // —— Shared by generator tools ——
  'error.negativeAmount': 'Amount cannot be negative',

  // —— Resume (#405) ——
  'resume.field.name': 'Name',
  'resume.field.title': 'Job title',
  'resume.field.phone': 'Phone',
  'resume.field.email': 'Email',
  'resume.field.summary': 'Summary',
  'resume.field.experience': 'Experience',
  'resume.field.education': 'Education',
  'resume.field.skills': 'Skills',
  'resume.hint':
    'Each field has a length limit (name 40 chars, summary 500, experience 3000, etc.); export the preview as a PNG image.',
  'resume.empty': 'Fill in the form on the left; the resume preview updates live on the right',
  'resume.label.contact': 'Contact',
  'resume.error.emptyName': 'Please enter a name',
  'resume.error.tooLong': '{field} exceeds the {max}-character limit',

  // —— Invoice (#406) ——
  'invoice.field.seller': 'Seller',
  'invoice.field.buyer': 'Buyer',
  'invoice.field.number': 'Invoice no.',
  'invoice.field.date': 'Date',
  'invoice.field.items': 'Line items',
  'invoice.field.taxRate': 'Tax rate (%)',
  'invoice.field.notes': 'Notes',
  'invoice.itemsHint': 'One item per line: name,quantity,unit price (e.g. Design service,2,500)',
  'invoice.label.item': 'Item',
  'invoice.label.quantity': 'Qty',
  'invoice.label.unitPrice': 'Unit price',
  'invoice.label.amount': 'Amount',
  'invoice.label.subtotal': 'Subtotal',
  'invoice.label.tax': 'Tax',
  'invoice.label.total': 'Total',
  'invoice.empty': 'Fill in the form on the left; the invoice preview updates live on the right',
  'invoice.error.noItems': 'Please enter at least one line item',
  'invoice.error.badItem': 'Line {line} is malformed; expected "name,quantity,unit price"',
  'invoice.error.invalidQuantity': 'Invalid quantity on line {line}: {value}',
  'invoice.error.invalidPrice': 'Invalid unit price on line {line}: {value}',
  'invoice.error.negativeValue': 'Values on line {line} cannot be negative',
  'invoice.error.invalidTaxRate': 'Invalid tax rate: {value} (expected a number between 0 and 100)',
  'invoice.error.invalidDate': 'Invalid date: {value} (expected YYYY-MM-DD)',
  'invoice.error.tooLong': '{field} exceeds the {max}-character limit',

  // —— Receipt (#407) ——
  'receipt.field.payer': 'Payer',
  'receipt.field.payee': 'Payee',
  'receipt.field.amount': 'Amount',
  'receipt.field.date': 'Date',
  'receipt.field.reason': 'Purpose',
  'receipt.field.number': 'Receipt no.',
  'receipt.method': 'Payment method',
  'receipt.method.cash': 'Cash',
  'receipt.method.transfer': 'Bank transfer',
  'receipt.method.card': 'Card',
  'receipt.method.other': 'Other',
  'receipt.empty': 'Fill in the form on the left; the receipt preview updates live on the right',
  'receipt.error.emptyAmount': 'Please enter an amount',
  'receipt.error.invalidDate': 'Invalid date: {value} (expected YYYY-MM-DD)',
  'receipt.error.tooLong': '{field} exceeds the {max}-character limit',

  // —— Business card (#408) ——
  'businessCard.field.name': 'Name',
  'businessCard.field.title': 'Job title',
  'businessCard.field.company': 'Company',
  'businessCard.field.phone': 'Phone',
  'businessCard.field.email': 'Email',
  'businessCard.field.website': 'Website',
  'businessCard.hint':
    'Output is SVG vector code; copy or download it, open in a browser, or convert to an image.',
  'businessCard.error.emptyName': 'Please enter a name',
  'businessCard.error.tooLong': '{field} exceeds the {max}-character limit',

  // —— Poster (#409) ——
  'poster.field.title': 'Title',
  'poster.field.subtitle': 'Subtitle',
  'poster.field.body': 'Body',
  'poster.field.footer': 'Footer',
  'poster.theme': 'Theme',
  'poster.theme.blue': 'Navy',
  'poster.theme.green': 'Forest',
  'poster.theme.orange': 'Ember',
  'poster.theme.dark': 'Midnight',
  'poster.empty': 'Fill in the form on the left; the poster preview updates live on the right',
  'poster.error.emptyTitle': 'Please enter a title',
  'poster.error.tooLong': '{field} exceeds the {max}-character limit',
  'poster.error.unknownTheme': 'Unknown theme: {value}',

  // —— Random decision (#410) ——
  'randomDecision.extra.count': 'How many to pick',
  'randomDecision.option.allowRepeat': 'Allow picking the same option twice',
  'randomDecision.options': 'Options',
  'randomDecision.count': 'Pick count',
  'randomDecision.result': 'Decision',
  'randomDecision.error.empty': 'Enter some options first (one per line)',
  'randomDecision.error.countEmpty': 'Enter how many to pick',
  'randomDecision.error.countInvalid':
    'Invalid pick count: {value} (must be a non-negative integer)',
  'randomDecision.error.countTooLarge': 'Pick count too large: max {max}',
  'randomDecision.error.countExceeds':
    'Without replacement, count ({count}) cannot exceed the number of options ({total})',

  // —— Lottery draw (#411) ——
  'lottery.extra.count': 'Winners to draw',
  'lottery.option.withReplacement': 'With replacement (repeat wins allowed)',
  'lottery.pool': 'Candidates',
  'lottery.count': 'Winners to draw',
  'lottery.result': 'Winners',
  'lottery.error.empty': 'Enter the name list first (one per line)',
  'lottery.error.countEmpty': 'Enter how many to draw',
  'lottery.error.countInvalid': 'Invalid draw count: {value} (must be an integer)',
  'lottery.error.countNegative': 'Draw count cannot be negative',
  'lottery.error.countTooLarge': 'Draw count too large: max {max}',
  'lottery.error.countExceeds':
    'Without replacement, count ({count}) cannot exceed the name list size ({total})',

  // —— Prize wheel (#412) ——
  'wheel.extra.winners': 'Winners',
  'wheel.segments': 'Segments',
  'wheel.winners': 'Winners',
  'wheel.result': 'Winners',
  'wheel.spin': 'Spin the wheel',
  'wheel.idle': 'Click “Spin the wheel” to draw',
  'wheel.error.empty': 'Enter some options first (one per line)',
  'wheel.error.tooFew': 'A wheel needs at least 2 options',
  'wheel.error.tooMany': 'Too many options: max {max}',
  'wheel.error.countEmpty': 'Enter how many winners',
  'wheel.error.countInvalid': 'Invalid winner count: {value} (must be a non-negative integer)',
  'wheel.error.countTooLarge': 'Winner count too large: max {max}',
  'wheel.error.countExceeds': 'Winner count ({count}) cannot exceed the option count ({total})',

  // —— Voting (#413) ——
  'voting.error.empty': 'Enter the voting options first (one per line)',
  'voting.error.tooFew': 'Voting needs at least 2 options',
  'voting.error.badIndex': 'Option index out of range: {index}',
  'voting.start': 'Start voting',
  'voting.vote': 'Vote',
  'voting.votes': 'votes',
  'voting.total': 'Total votes',
  'voting.reset': 'Reset votes',
  'voting.result': 'Results',
  'voting.notice': 'Results are kept only on this page and are lost on refresh',
  'voting.idle': 'Click “Start voting”, then vote for an option',

  // —— Dice (#414) ——
  'dice.extra.sides': 'Sides per die',
  'dice.count': 'Dice count',
  'dice.sides': 'Sides per die',
  'dice.result': 'Roll result',
  'dice.total': 'Total',
  'dice.roll': 'Roll the dice',
  'dice.idle': 'Click “Roll the dice” to start',
  'dice.error.countEmpty': 'Enter the dice count',
  'dice.error.countInvalid': 'Invalid dice count: {value} (must be an integer from 1 to 100)',
  'dice.error.countTooLarge': 'Dice count too large: max {max}',
  'dice.error.sidesEmpty': 'Enter the number of sides',
  'dice.error.sidesInvalid': 'Invalid sides: {value} (must be an integer from 2 to 100)',
  'dice.error.sidesTooLarge': 'Too many sides: max {max}',

  // —— Coin flip (#415) ——
  'coin.count': 'Flip count',
  'coin.result': 'Flip result',
  'coin.heads': 'Heads',
  'coin.tails': 'Tails',
  'coin.headsCount': 'Heads × {count}',
  'coin.tailsCount': 'Tails × {count}',
  'coin.flip': 'Flip the coin',
  'coin.idle': 'Click “Flip the coin” to start',
  'coin.error.countEmpty': 'Enter the flip count',
  'coin.error.countInvalid': 'Invalid flip count: {value} (must be an integer from 1 to 10000)',
  'coin.error.countTooLarge': 'Flip count too large: max {max}',

  // —— Random grouping (#416) ——
  'randomGroup.groups': 'Group count',
  'randomGroup.groupHeader': 'Group {n} ({count} people)',
  'randomGroup.error.invalidGroupCount':
    'Invalid group count: {value} (must be a positive integer)',
  'randomGroup.error.tooManyGroups':
    'Group count ({groups}) cannot exceed the number of people ({count})',

  // —— Random color palette (#418) ——
  'colorPalette.mode': 'Harmony mode',
  'colorPalette.count': 'Color count',
  'colorPalette.error.invalidColor':
    'Unparsable color: {value} (supports #rgb / #rrggbb / CSS color names)',
  'colorPalette.error.invalidMode': 'Unknown harmony mode: {value}',
  'colorPalette.error.invalidCount': 'Invalid color count: {value} (must be an integer 1–{max})',

  // —— Passphrase generator (#419) ——
  'passphraseGen.capitalize': 'Capitalize words',
  'passphraseGen.note':
    'This tool generates memorable multi-word phrases (e.g. correct-horse-battery-staple), ideal as a master password you need to remember; for a single high-entropy random string, use the “Random Password” tool instead.',
  'passphraseGen.error.invalidWordCount':
    'Invalid word count: {value} (must be an integer 1–{max})',
  'passphraseGen.error.separatorTooLong': 'Separator too long: max {max} characters',

  // —— Bulk password generator (#420) ——
  'bulkPassword.count': 'Count',
  'bulkPassword.note':
    'This tool generates many random passwords at once (up to {max}), ideal for bulk provisioning and account setup; if you only need one password, use the “Random Password” tool. Everything is generated locally; 10,000 passwords take about a second.',
  'bulkPassword.error.invalidCount': 'Invalid count: {value} (must be an integer 1–{max})',
  'bulkPassword.error.invalidLength': 'Unsupported length: {value}',
  'bulkPassword.error.noCharset':
    'Select at least one character class (lowercase / uppercase / digits / symbols)',

  // —— Shared Mermaid diagram preview keys (#400–#403) ——
  'mermaid.error.wrongDirective':
    'The first line must be "{expected}" — check you pasted the right diagram type',
  'mermaid.error.renderFailed': 'Render failed: please check your Mermaid syntax',
  'mermaid.notice.truncated':
    'Code exceeded {max} characters; truncated to the first {max} characters before rendering',

  // —— Sequence diagram (#400) ——
  'sequence.error.emptyCode': 'Code is empty: please enter Mermaid sequence diagram code',
  'sequence.preview.empty':
    'Enter Mermaid sequence diagram code on the left; the preview updates on the right',
  'sequence.preview.rendering': 'Rendering…',

  // —— ER diagram generator (#401) ——
  'erGen.error.emptyCode': 'Code is empty: please enter Mermaid ER diagram code',
  'erGen.preview.empty':
    'Enter Mermaid ER diagram code on the left; the preview updates on the right',
  'erGen.preview.rendering': 'Rendering…',

  // —— UML diagram (#402) ——
  'uml.error.emptyCode': 'Code is empty: please enter Mermaid UML class diagram code',
  'uml.preview.empty':
    'Enter Mermaid UML class diagram code on the left; the preview updates on the right',
  'uml.preview.rendering': 'Rendering…',

  // —— Gantt chart (#403) ——
  'gantt.error.emptyCode': 'Code is empty: please enter Mermaid Gantt chart code',
  'gantt.preview.empty':
    'Enter Mermaid Gantt chart code on the left; the preview updates on the right',
  'gantt.preview.rendering': 'Rendering…',

  // —— Timeline generator (#404) ——
  'timelineGen.error.badLine': 'Line {line} is malformed: use "date | title"',
  'timelineGen.error.emptyTitle': 'Line {line} has an empty title',
  'timelineGen.error.badDate': 'Unparseable date: {value} (use YYYY-MM-DD)',
  'timelineGen.error.noValidEvents': 'No parsable events: write one "date | title" per line',
  'timelineGen.preview.empty': 'Enter events as "date | title" on the left to build the timeline',
  'timelineGen.direction': 'Direction',
  'timelineGen.showGap': 'Show gaps',
  'timelineGen.gapDays': '{days} days after the previous event',
  'timelineGen.notice.truncated': 'More than {max} events; showing the first {max}',

  // —— Shared ——
  'error.cryptoUnavailable':
    'This environment does not support crypto.getRandomValues, so secure random generation is unavailable (please use a modern browser in a secure context)',

  // —— Feasibility labels ——
  'feasibility.A': 'Pure JS',
  'feasibility.B': 'WASM',
  'feasibility.C': 'Web API',
  'feasibility.D': 'Bring your own key',
  'feasibility.E': 'Needs a backend',
}
