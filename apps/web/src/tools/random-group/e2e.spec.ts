import { expect, test } from '@playwright/test'

test.describe('random-group 随机分组 (#416)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/random-group')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/随机分组/)
  })

  test('点示例输出 2 个组、6 人不重不漏', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    expect(text).toContain('第 1 组')
    expect(text).toContain('第 2 组')
    for (const name of ['张三', '李四', '王五', '赵六', '钱七', '孙八']) {
      expect(text).toContain(name)
    }
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('随机分组')
    await page.getByText('随机分组', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/random-group/)
  })
})
