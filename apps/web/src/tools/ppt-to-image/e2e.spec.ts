/**
 * ppt-to-image E2E（Playwright）
 *
 * 只编写、不在当前环境执行（浏览器未安装，见任务说明）。
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * fixture：与 Tool.test.tsx 中 PPTX_DEMO 同构的最小 pptx
 * （两张幻灯片：slide1 文本「标题一 / 要点 <1>」，slide2 空白）。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

/** 最小 pptx fixture（base64） */
const PPTX_DEMO =
  'UEsDBBQAAAAIAJIMPF0TXpwO8wAAAKUCAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbLVSS2rDMBC9itC2WHKyKKXYzqKfZdtFegAhj21R/dAoIb19x3YKbUgCgWQlZt5XQtVq5yzbQkITfM0XouQMvA6t8X3NP9evxQNfNdX6OwIyonqs+ZBzfJQS9QBOoQgRPCFdSE5lGlMvo9Jfqge5LMt7qYPP4HORRw/eVM/QqY3N7GVH6zk2gUXOnmbimFVzFaM1WmXC5da3BynFPkGQcuLgYCLeEYHLowkjcjpgr3und0imBfahUn5TjlgyxixjAiTdxBXnnY5UDV1nNLRBbxxJxF8zZ/+Nwinjfy9xqgxaWuJ8LK7dZnK9pMHypg3k9O+aH1BLAwQUAAAACACSDDxdoQomsqQAAAAbAQAACwAAAF9yZWxzLy5yZWxzjY/BCsIwDIZfpeTusnkQkXW7iLCrzAcoXbYV1za0VfTtLZ6cePCY5Mv389ftwy7iTiEa7yRURQmCnPaDcZOES3/a7KFt6jMtKmUizoajyC8uSphT4gNi1DNZFQvP5PJl9MGqlMcwISt9VRPhtix3GD4dsHaKbpAQuqEC0T+Z/nH7cTSajl7fLLn0I+KLyGYVJkoSmBNyoJiXb7rIZsCmxlXL5gVQSwMEFAAAAAgAkgw8XR5uKq6mAAAAHwEAABQAAABwcHQvcHJlc2VudGF0aW9uLnhtbI2OzQrCMBCEXyXs3aZWEAlNexGh4FEfICRpG8gf2Sg+vqmK9ODB287szMe0/cNZctcJTfActlUNRHsZlPETh+vltDlA37WRxaRR+yxyyZHS8cgihznnyChFOWsnsApR+/IbQ3IiF5kmuu45S5u63lMnjIcPJP0DCeNopD4GeXOF9YYkbV9QnE1EWCaiVYM6Y/7eJDGjOKRBNUB/uLvFpetiEevB3RNQSwMEFAAAAAgAkgw8XZcpbb6rAAAAlAEAAB8AAABwcHQvX3JlbHMvcHJlc2VudGF0aW9uLnhtbC5yZWxzvZDLCsIwEEV/JczeplYQkabdiNCt1A8IyTQNNg+SKPr3BlGw0IUrl3ceZw5Tt3czkRuGqJ1lsC5KIGiFk9oqBuf+uNpB29QnnHjKE3HUPpK8YiODMSW/pzSKEQ2PhfNoc2dwwfCUY1DUc3HhCmlVllsavhkwZ5JOMgidrID0D4+/sN0waIEHJ64GbVo4QeOkJWYgDwoTg1d8V9dFpgFdltj8SaL6SNDZe5snUEsDBBQAAAAIAJIMPF3A2a8N6wAAAL8BAAAVAAAAcHB0L3NsaWRlcy9zbGlkZTEueG1sjU87bsJAEL2KtQVdWJMiihbbSClSRwo5wMa7MZb2p91RQrokTRoOQIkoOANwHsTnFsxiJIRE4ebNm897epMNxloln9KH2pqc9LopSaQprahNlZO34fPdIxkUmWNBiQRPTWA8JyMAxygN5UhqHrrWSYO7D+s1B2x9RYXnX2ihFb1P0weqeW3IWe/a6J2XQRrggLGuTGKW8lWJUyY39FI2LCKMn6z4LjLO3rG+eBopbjjzEaDYzv4P8+lm+ZPR2EbEDSIe0YseaWPY0na/+N39rZKOgn6vU0H/hvstwWY9aZXjVJpPkTbPxxnWI1BLAwQUAAAACACSDDxdQuHPQKYAAAATAQAAFQAAAHBwdC9zbGlkZXMvc2xpZGUyLnhtbI1OywrCMBD8lZK7TfUgEvoAD54F6wfEZm0LebEJWv/eTSOINy87s7szw9TdYnTxAAyzsw3blhUrwA5OzXZs2LU/bQ6sa2svglYFSW0QsmFTjF5wHoYJjAyl82Dpd3doZKQVR65QPinCaL6rqj03crbs4/f/+D1CABtlpFo/IanLcNFq7eR7BMgszbgcnXq1tRQ3wjPyRD1N/v0RTeIVsptoDkw3wjdQSwECFAAUAAAACACSDDxdE16cDvMAAAClAgAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAIAJIMPF2hCiaypAAAABsBAAALAAAAAAAAAAAAAAAAACQBAABfcmVscy8ucmVsc1BLAQIUABQAAAAIAJIMPF0ebiqupgAAAB8BAAAUAAAAAAAAAAAAAAAAAPEBAABwcHQvcHJlc2VudGF0aW9uLnhtbFBLAQIUABQAAAAIAJIMPF2XKW2+qwAAAJQBAAAfAAAAAAAAAAAAAAAAAMkCAABwcHQvX3JlbHMvcHJlc2VudGF0aW9uLnhtbC5yZWxzUEsBAhQAFAAAAAgAkgw8XcDZrw3rAAAAvwEAABUAAAAAAAAAAAAAAAAAsQMAAHBwdC9zbGlkZXMvc2xpZGUxLnhtbFBLAQIUABQAAAAIAJIMPF1C4c9ApgAAABMBAAAVAAAAAAAAAAAAAAAAAM8EAABwcHQvc2xpZGVzL3NsaWRlMi54bWxQSwUGAAAAAAYABgCPAQAAqAUAAAAA'

test.describe('ppt-to-image', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ppt-to-image')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PPT 转图片/)
  })

  test('文件入口与选项存在', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
    await expect(page.getByTestId('size')).toBeVisible()
    await expect(page.getByTestId('background')).toBeVisible()
  })

  test('上传 pptx → 每张幻灯片渲染为图片', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      buffer: Buffer.from(PPTX_DEMO, 'base64'),
    })

    await expect(page.getByTestId('image-list')).toBeVisible({ timeout: 15000 })
    const src1 = await page.getByTestId('slide-image-1').getAttribute('src')
    const src2 = await page.getByTestId('slide-image-2').getAttribute('src')
    expect(src1).toMatch(/^data:image\/png;base64,/)
    expect(src2).toMatch(/^data:image\/png;base64,/)

    // 逐张下载链接
    await expect(page.getByTestId('download-slide-1')).toHaveAttribute('download', 'slide-1.png')
    await expect(page.getByTestId('download-slide-2')).toHaveAttribute('download', 'slide-2.png')
  })

  test('切换尺寸后重渲染', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      buffer: Buffer.from(PPTX_DEMO, 'base64'),
    })
    await expect(page.getByTestId('image-list')).toBeVisible({ timeout: 15000 })
    await page.getByTestId('size').selectOption('1280x720')
    await expect(page.getByTestId('image-list')).toContainText('1280×720')
  })

  test('上传损坏文件 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'bad.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      buffer: Buffer.from([1, 2, 3]),
    })
    await expect(page.getByTestId('ppt-error')).toContainText('文件解析失败', { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ppt-to-image')
    await page.getByText('PPT 转图片').first().click()
    await expect(page).toHaveURL(/\/tools\/ppt-to-image$/)
  })
})
