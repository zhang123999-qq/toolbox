/**
 * excel-to-markdown E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 说明：本机未安装 Playwright 浏览器（~/.cache/ms-playwright 为空），
 * 该文件只编写不运行。
 */
import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

function workbookBuffer(): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['姓名', '年龄'],
      ['张三', 30],
    ]),
    '人员',
  )
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as Uint8Array
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

test.describe('excel-to-markdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/excel-to-markdown')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Excel 转 Markdown/)
  })

  test('上传 xlsx → 输出 Markdown 表格', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: workbookBuffer(),
    })
    const out = page.getByTestId('output')
    await expect(out).toContainText('## 人员', { timeout: 30000 })
    await expect(out).toContainText('| 姓名 | 年龄 |', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('excel-to-markdown')
    await page.getByText('Excel 转 Markdown').first().click()
    await expect(page).toHaveURL(/\/tools\/excel-to-markdown$/)
  })
})
