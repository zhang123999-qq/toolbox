/**
 * mixed-content E2E（纯离线）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('mixed-content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/mixed-content')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/混合内容检测/)
  })

  test('示例 → 同步输出风险报告', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('风险等级：风险')
    await expect(page.getByTestId('output')).toContainText('http://cdn.example.com/app.js')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('混合内容')
    await page.getByText('混合内容检测').first().click()
    await expect(page).toHaveURL(/\/tools\/mixed-content$/)
  })
})
