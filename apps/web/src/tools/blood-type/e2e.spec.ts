/**
 * blood-type E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('blood-type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/blood-type')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/血型配对/)
  })

  test('示例 → 输出 A+ 的供血者列表', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('受血者：A+')
    await expect(page.getByTestId('output')).toContainText('O-、O+、A-、A+')
  })

  test('非法血型 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('X')
    await expect(page.getByTestId('output')).toContainText('无法识别的血型')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('血型配对')
    await page.getByText('血型配对').first().click()
    await expect(page).toHaveURL(/\/tools\/blood-type$/)
  })
})
