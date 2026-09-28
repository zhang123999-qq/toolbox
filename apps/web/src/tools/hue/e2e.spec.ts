import { expect, test } from '@playwright/test'

test.describe('hue 色相调整 (#438)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/hue')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/色相/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-hue')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('有 ctx.filter 浏览器支持说明', async ({ page }) => {
    await expect(page.getByText(/Safari 18/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('色相调整')
    await page.getByText('色相调整', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/hue/)
  })
})
