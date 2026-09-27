import { expect, test } from '@playwright/test'

test.describe('random-sort 随机排序 (#417)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/random-sort')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/随机排序/)
  })

  test('点示例输出 4 行、集合不变', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(4)
    expect([...lines].sort()).toEqual(['张三', '李四', '王五', '赵六'].sort())
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('随机排序')
    await page.getByText('随机排序', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/random-sort/)
  })
})
