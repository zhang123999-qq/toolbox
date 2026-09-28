import { expect, test } from '@playwright/test'

test.describe('filter 照片滤镜 (#434)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/filter')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/照片滤镜/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-preset')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('预设下拉有 8 个选项', async ({ page }) => {
    const options = page.getByTestId('opt-preset').locator('option')
    await expect(options).toHaveCount(8)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('照片滤镜')
    await page.getByText('照片滤镜', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/filter/)
  })
})
