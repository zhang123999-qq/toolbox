/**
 * uml E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('uml', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/uml')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/UML 图/)
  })

  test('示例 → 右侧渲染出 SVG 预览', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('preview-svg').locator('svg')).toHaveCount(1)
  })

  test('错误指令 → 右侧显示双语错误', async ({ page }) => {
    await page.getByTestId('input').fill('erDiagram\n    A ||--o{ B : has')
    await expect(page.getByTestId('preview-error')).toContainText('classDiagram')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('UML 图')
    await page.getByText('UML 图').first().click()
    await expect(page).toHaveURL(/\/tools\/uml$/)
  })
})
