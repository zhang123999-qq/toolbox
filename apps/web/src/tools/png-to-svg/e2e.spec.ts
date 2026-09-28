import { expect, test } from '@playwright/test'

test.describe('png-to-svg PNG 转 SVG (#454)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/png-to-svg')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PNG 转 SVG/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-colors')).toBeVisible()
    await expect(page.getByTestId('opt-maxedge')).toBeVisible()
    await expect(page.getByTestId('opt-minarea')).toBeVisible()
    await expect(page.getByTestId('opt-keepbg')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PNG 转 SVG')
    await page.getByText('PNG 转 SVG', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/png-to-svg/)
  })
})
