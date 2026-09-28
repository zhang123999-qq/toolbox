/**
 * mnemonic E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('mnemonic 助记词 (#702)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/mnemonic')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/助记词/)
  })

  test('生成模式默认展示 12 词', async ({ page }) => {
    const text = await page.getByTestId('result-0').textContent()
    expect(text!.trim().split(/\s+/)).toHaveLength(12)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('助记词')
    await page.getByText('助记词', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/mnemonic$/)
  })
})
