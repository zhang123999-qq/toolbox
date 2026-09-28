import { expect, test } from '@playwright/test'

test.describe('random-string 随机字符串 (#372)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/random-string')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/随机字符串/)
  })

  test('点示例输出 32 位字母数字串', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text.trim()).toMatch(/^[A-Za-z0-9]{32}$/)
  })

  test('非法长度显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('option-length').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/字符串长度必须在/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('随机字符串')
    await page.getByText('随机字符串', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/random-string/)
  })
})
