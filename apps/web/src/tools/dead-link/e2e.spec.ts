/**
 * dead-link E2E（只写不跑）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：检测依赖目标站点可达且允许跨域；离线环境会失败。
 * 以下用例只覆盖页面可达与无效输入校验（纯本地逻辑）。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('dead-link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/dead-link')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/死链检查/)
  })

  test('空输入开始检测显示错误提示', async ({ page }) => {
    await page.getByTestId('check').click()
    await expect(page.getByTestId('error')).toContainText(/每行一个/)
  })

  test('示例输入可解析', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).not.toBeEmpty()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('死链检查')
    await page.getByText('死链检查').first().click()
    await expect(page).toHaveURL(/\/tools\/dead-link$/)
  })
})
