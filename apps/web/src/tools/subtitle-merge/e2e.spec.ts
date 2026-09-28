/**
 * subtitle-merge E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('subtitle-merge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/subtitle-merge')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/字幕合并/)
  })

  test('载入示例字幕 → 合并排序并显示统计', async ({ page }) => {
    await page.getByTestId('example-files').click()
    await expect(page.getByTestId('result-text')).toContainText('1\n00:00:01,000 --> 00:00:04,000')
    await expect(page.getByTestId('result-info')).toContainText('参与文件：2 个')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('subtitle-merge')
    await page.getByText('字幕合并').first().click()
    await expect(page).toHaveURL(/\/tools\/subtitle-merge$/)
  })
})
