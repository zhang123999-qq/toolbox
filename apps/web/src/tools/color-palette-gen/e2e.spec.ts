import { expect, test } from '@playwright/test'

const HEX = /^#[0-9a-f]{6}$/

test.describe('color-palette-gen 随机颜色板 (#418)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/color-palette-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/颜色板/)
  })

  test('点示例输出 3 个合法 hex', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(line).toMatch(HEX)
  })

  test('非法颜色显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('notacolor')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/无法解析的颜色/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('颜色板')
    await page.getByText('随机颜色板', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/color-palette-gen/)
  })
})
