/**
 * file-split E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('file-split', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/file-split')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文件切分/)
  })

  test('示例 → 切分 → 输出分片清单', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('4 个分片', { timeout: 30000 })
    await expect(page.getByTestId('part-list')).toContainText('demo.part1.bin')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('file-split')
    await page.getByText('文件切分').first().click()
    await expect(page).toHaveURL(/\/tools\/file-split$/)
  })
})
