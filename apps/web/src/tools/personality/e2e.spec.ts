/**
 * personality E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，计分在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('性格测试 (#838)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/personality')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/性格测试/)
  })

  test('问卷题目与提交按钮存在', async ({ page }) => {
    await expect(page.getByTestId('personality-q-q1-a')).toBeVisible()
    await expect(page.getByTestId('personality-submit')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('性格测试')
    await expect(page.getByRole('link', { name: /性格测试/ }).first()).toBeVisible()
  })
})
