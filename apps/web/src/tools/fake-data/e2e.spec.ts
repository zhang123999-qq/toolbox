import { expect, test } from '@playwright/test'

test.describe('fake-data 假数据生成 (#375)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/fake-data')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/假数据/)
  })

  test('点示例输出合法 JSON', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text).toContain('name')
    expect(() => JSON.parse(text)).not.toThrow()
  })

  test('非法字段显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('foo')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/不支持的字段类型/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('假数据')
    await page.getByText('假数据生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/fake-data/)
  })
})
