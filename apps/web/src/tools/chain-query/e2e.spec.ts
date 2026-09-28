/**
 * chain-query E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('chain-query 链上查询 (#701)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/chain-query')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/链上查询/)
  })

  test('非法地址点运行报错', async ({ page }) => {
    await page.getByTestId('input').fill('0x123')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('地址格式错误')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('链上查询')
    await page.getByText('链上查询', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/chain-query$/)
  })
})
