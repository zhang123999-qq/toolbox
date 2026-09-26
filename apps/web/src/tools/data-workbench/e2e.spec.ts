/**
 * data-workbench E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('data-workbench', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/data-workbench`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数据/)
  })

  test('示例 → 默认流水线给出每步结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('== 步骤 1 · trimlines ==')
    await expect(page.getByTestId('output')).toContainText('== 最终结果 ==')
  })

  test('改写步骤后重算，并切到只输出最终结果', async ({ page }) => {
    await page.getByTestId('input').fill('{"a":1}')
    await page.getByTestId('option-steps').fill('json2yaml')
    await page.getByLabel('模式').selectOption('final')
    await expect(page.getByTestId('output')).toContainText('a: 1')
  })

  test('未知步骤时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('x')
    await page.getByTestId('option-steps').fill('nope')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('数据转换')
    await page.getByText('数据转换工作台').first().click()
    await expect(page).toHaveURL(/\/tools\/data-workbench$/)
  })
})
