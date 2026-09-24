// 部署产物冒烟：对「已经跑起来的站点」做 HTTP 级核心流程校验。
// 与 playwright 的差别：这里只看真实 HTTP 行为（状态码 / 预渲染 HTML / 404 语义），
// 跑在容器里、也跑在 compose 的 nginx 服务上，用来兜住 nginx 配置类问题
// （try_files 写错会导致软 404、types{} 覆盖会导致 html 变 octet-stream）。
//
//   SMOKE_BASE_URL=http://127.0.0.1:4173 node deploy/docker/smoke.mjs
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173'

const results = []
let failed = 0

function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`)
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' })
  const body = await res.text()
  return { status: res.status, headers: res.headers, body }
}

// 1) 首页：200 + 是 HTML + 有预渲染内容
{
  const r = await get('/')
  check('GET / -> 200', r.status === 200, `status=${r.status}`)
  check(
    'GET / -> content-type 为 html',
    (r.headers.get('content-type') || '').includes('text/html'),
    `content-type=${r.headers.get('content-type')}`,
  )
  check('GET / -> 预渲染有实质内容', r.body.length > 2000, `bytes=${r.body.length}`)
}

// 2) 工具页：核心业务流程入口必须直出 200
//    slug 必须是 catalog 真值（apps/web/src/tools/<id>/ 的目录名）：
//    写错的话 vite preview 因为 SPA 回退照样返回 200，只有真 nginx 才暴露 404。
for (const slug of ['json-formatter', 'word-count', 'case-convert']) {
  const r = await get(`/tools/${slug}/`)
  check(`GET /tools/${slug}/ -> 200`, r.status === 200, `status=${r.status}`)
  check(`GET /tools/${slug}/ -> 非软 404`, !/not found|404/i.test(r.body.slice(0, 400)), '')
}

// 3) 未知路径的 404 语义
//    nginx（真实部署）：try_files ... =404 → 硬 404，配 error_page 渲染 404.html；
//    vite preview（构建期自检）：自带 SPA 回退 → 未知路径返回 200 + 空壳。
//    两者都是「正确行为」，所以断言必须环境感知：SMOKE_SPA_FALLBACK=1 时按回退断言，
//    而不是把 preview 的合法行为记成失败（那只会逼人去注释用例）。
{
  const r = await get('/definitely-not-a-real-page/')
  if (process.env.SMOKE_SPA_FALLBACK === '1') {
    check(
      'GET /definitely-not-a-real-page/ -> SPA 回退（preview 语义，200 + 应用外壳）',
      r.status === 200 && r.body.includes('<div id="root"'),
      `status=${r.status}`,
    )
  } else {
    check(
      'GET /definitely-not-a-real-page/ -> 硬 404（nginx 语义）',
      r.status === 404,
      `status=${r.status}`,
    )
    check('404 页是 SSG 定制页而非空壳', /页面不存在/.test(r.body), '')
  }
}

// 4) SEO 产物
{
  const s = await get('/sitemap.xml')
  check('GET /sitemap.xml -> 200', s.status === 200, `status=${s.status}`)
  check('sitemap 含 urlset', s.body.includes('<urlset'), '')
  const rb = await get('/robots.txt')
  check('GET /robots.txt -> 200', rb.status === 200, `status=${rb.status}`)
}

// 5) 静态资源：JS 产物能取到，且 content-type 是 javascript
{
  const idx = await get('/')
  const m = /src="(\/assets\/[^"]+\.js)"/.exec(idx.body)
  if (!m) {
    check('首页能解析出 JS 产物路径', false, 'body 中未找到 /assets/*.js')
  } else {
    const a = await get(m[1])
    check(`GET ${m[1]} -> 200`, a.status === 200, `status=${a.status}`)
    check(
      `${m[1]} content-type 为 javascript`,
      /javascript/.test(a.headers.get('content-type') || ''),
      `content-type=${a.headers.get('content-type')}`,
    )
  }
}

console.log(`\nSMOKE: ${results.length - failed}/${results.length} passed`)
process.exit(failed > 0 ? 1 : 0)
