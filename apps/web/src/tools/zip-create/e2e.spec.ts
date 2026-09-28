/**
 * zip-create E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('zip-create', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/zip-create')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/打包 ZIP/)
  })

  test('示例 → 打包 → 输出成功报告', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    const out = page.getByTestId('output')
    await expect(out).toContainText('打包成功', { timeout: 30000 })
    await expect(out).toContainText('archive.zip')
    await expect(out).toContainText('hello.txt')
  })

  test('可多选文件上传并打包', async ({ page }) => {
    await page.getByTestId('file').setInputFiles([
      { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('aaa') },
      { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('bbb') },
    ])
    await expect(page.getByTestId('file-list')).toContainText('a.txt')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('文件数：2', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('zip-create')
    await page.getByText('打包 ZIP').first().click()
    await expect(page).toHaveURL(/\/tools\/zip-create$/)
  })
})
