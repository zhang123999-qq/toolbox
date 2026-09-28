import { expect, test } from '@playwright/test'

test.describe('brightness-contrast 亮度/对比度 (#436)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/brightness-contrast')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/亮度\/对比度/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-brightness')).toBeVisible()
    await expect(page.getByTestId('opt-contrast')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('注明 ctx.filter 浏览器支持', async ({ page }) => {
    await expect(page.getByText(/Safari 18/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('亮度/对比度')
    await page.getByText('亮度/对比度', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/brightness-contrast/)
  })
})
