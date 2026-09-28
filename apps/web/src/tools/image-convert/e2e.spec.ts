import { expect, test } from '@playwright/test'

test.describe('image-convert 图片格式转换 (#426)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-convert')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片格式转换/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('有 AVIF 仅输入说明', async ({ page }) => {
    await expect(page.getByText(/AVIF/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片格式转换')
    await page.getByText('图片格式转换', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-convert/)
  })
})
