/**
 * encoding-convert E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('encoding-convert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/encoding-convert`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/编码/)
  })

  test('示例 → GBK 十六进制字节', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText('b9a4bedfcfe4')
  })

  test('切到解码方向后还原出中文', async ({ page }) => {
    await page.getByTestId('input').fill('b9a4bedfcfe4')
    await page.getByLabel('方向').selectOption('decode')
    await expect(page.getByTestId('output')).toHaveText('工具箱')
  })

  test('切到不支持的字符集时给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('工具 🚀')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('编码转换')
    await page.getByText('编码转换').first().click()
    await expect(page).toHaveURL(/\/tools\/encoding-convert$/)
  })
})
