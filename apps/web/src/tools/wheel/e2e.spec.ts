/**
 * wheel E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('wheel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/wheel')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/转盘/)
  })

  test('示例 → 转盘与获奖名单渲染', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('wheel-disc')).toBeVisible()
    await expect(page.getByTestId('output')).toContainText('获奖名单')
  })

  test('点「开始转盘」→ 转盘旋转（角度变化）', async ({ page }) => {
    await page.getByTestId('example').click()
    const disc = page.getByTestId('wheel-disc')
    const before = await disc.evaluate((el) => el.getAttribute('data-round'))
    await page.getByTestId('spin').click()
    const after = await disc.evaluate((el) => el.getAttribute('data-round'))
    expect(after).not.toBe(before)
  })

  test('单选项 → 错误态', async ({ page }) => {
    await page.getByTestId('input').fill('唯一选项')
    await page.getByTestId('input-winners').fill('1')
    await expect(page.getByTestId('output')).toContainText('至少需要 2 个选项')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('转盘')
    await page.getByText('转盘').first().click()
    await expect(page).toHaveURL(/\/tools\/wheel$/)
  })
})
