/**
 * yaml-to-xml E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('yaml-to-xml', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/yaml-to-xml`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/XML/)
  })

  test('示例 → 转换 → 输出 XML 根元素', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText(/<root>/)
    await expect(page.getByTestId('output')).toHaveText(/<port>8080<\/port>/)
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('a:\n\tb: 1')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('yaml')
    await page.getByText('YAML 转 XML').first().click()
    await expect(page).toHaveURL(/\/tools\/yaml-to-xml$/)
  })
})
