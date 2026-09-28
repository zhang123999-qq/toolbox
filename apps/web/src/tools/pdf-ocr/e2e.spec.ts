/**
 * pdf-ocr E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：OCR 真实链路需要从 CDN 下载 tesseract 语言包；E2E 只覆盖
 * 文件校验与错误分支，不跑完整识别。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pdf-ocr', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pdf-ocr')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 文字识别/)
  })

  test('文件入口存在', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
  })

  test('上传非 PDF 文件给出中文错误提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByTestId('ocr-error')).toContainText('请选择 PDF 文件', { timeout: 15000 })
  })

  test('识别语言可切换', async ({ page }) => {
    const select = page.getByLabel('识别语言')
    await expect(select).toHaveValue('chi_sim+eng')
    await select.selectOption('eng')
    await expect(select).toHaveValue('eng')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('pdf-ocr')
    await page.getByText('PDF 文字识别').first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-ocr$/)
  })
})
