import { expect, test } from '@playwright/test'

const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]{26}$/

test.describe('ulid ULID 生成 (#378)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/ulid')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/ULID/)
  })

  test('点示例输出一个 26 字符 ULID', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(CROCKFORD)
  })

  test('非法数量显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('option-count').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/数量必须在/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('ULID')
    await page.getByText('ULID 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/ulid/)
  })
})
