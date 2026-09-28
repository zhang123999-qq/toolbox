/**
 * aria-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地生成；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ARIA 生成 (#717)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/aria-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/ARIA/)
  })

  test('示例填充组件名称', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue('确认删除对话框')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ARIA 生成')
    await page.getByText('ARIA 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/aria-gen$/)
  })
})
