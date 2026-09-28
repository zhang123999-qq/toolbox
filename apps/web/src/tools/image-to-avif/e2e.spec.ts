import { expect, test } from '@playwright/test'

test.describe('image-to-avif 图片转 AVIF (#478)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-to-avif')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片转 AVIF/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
    await expect(page.getByTestId('opt-maxdim')).toBeVisible()
  })

  test('有本地处理说明与 GIF 说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
    await expect(page.getByText(/第一帧/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片转 AVIF')
    await page.getByText('图片转 AVIF', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-to-avif/)
  })
})
