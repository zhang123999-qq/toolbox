import { expect, test } from '@playwright/test'

test.describe('image-flip 图片翻转 (#424)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-flip')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片翻转/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-h')).toBeVisible()
    await expect(page.getByTestId('opt-v')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('默认勾选水平翻转', async ({ page }) => {
    await expect(page.getByTestId('opt-h')).toBeChecked()
    await expect(page.getByTestId('opt-v')).not.toBeChecked()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片翻转')
    await page.getByText('图片翻转', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-flip/)
  })
})
