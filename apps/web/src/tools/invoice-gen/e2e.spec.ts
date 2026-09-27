/**
 * invoice-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('invoice-gen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/invoice-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/发票生成/)
  })

  test('示例 → 预览出现发票号与总计', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('invoice-preview')).toContainText('INV-2026-0001')
    await expect(page.getByTestId('invoice-preview')).toContainText('11,236.00')
  })

  test('明细格式错误 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('只有名称')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('第 1 行格式错误')
  })

  test('导出 PNG 按钮存在', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('export-png')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('发票生成')
    await page.getByText('发票生成').first().click()
    await expect(page).toHaveURL(/\/tools\/invoice-gen$/)
  })
})
