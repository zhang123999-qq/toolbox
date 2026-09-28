/**
 * pdf-link E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：本机未安装 Playwright 浏览器时只写文件不运行。
 * 上传用例的 PDF 由 makeSamplePdf() 在测试内动态生成，无需外部 fixture。
 */
import { expect, test } from '@playwright/test'
import { PDFDocument, StandardFonts } from 'pdf-lib'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

/** 测试内用 pdf-lib 动态生成带一小段文字的单页 PDF，不依赖外部 fixture 文件 */
async function makeSamplePdf(): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  page.drawText('Hello E2E', { x: 50, y: 750, size: 24, font })
  const bytes = await doc.save()
  return { name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) }
}

test.describe('pdf-link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pdf-link')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 加超链接/)
  })

  test('选文件 → 填链接 → 插入并下载 → 显示页数信息', async ({ page }) => {
    await page.getByTestId('file').setInputFiles(await makeSamplePdf())
    await page.getByTestId('input').fill('Visit us')
    await page.getByTestId('input-url').fill('https://example.com')
    await page.getByTestId('input-page').fill('1')
    await page.getByTestId('export-pdf').click()
    await expect(page.getByTestId('pdf-info')).toContainText(/页/, { timeout: 30000 })
  })

  test('非法链接给出明确中文错误', async ({ page }) => {
    await page.getByTestId('file').setInputFiles(await makeSamplePdf())
    await page.getByTestId('input').fill('Click')
    await page.getByTestId('input-url').fill('not-a-url')
    await page.getByTestId('input-page').fill('1')
    await page.getByTestId('export-pdf').click()
    await expect(page.getByTestId('export-error')).toContainText('http:// 或 https://')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('pdf-link')
    await page.getByText('PDF 加超链接').first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-link$/)
  })
})
