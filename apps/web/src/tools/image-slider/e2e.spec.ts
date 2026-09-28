import { expect, test } from '@playwright/test'

test.describe('image-slider 图片对比滑块 (#479)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-slider')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片对比滑块/)
  })

  test('两个投放区与方向选项可见', async ({ page }) => {
    await expect(page.getByTestId('drop-before')).toBeVisible()
    await expect(page.getByTestId('drop-after')).toBeVisible()
    await expect(page.getByTestId('opt-direction')).toBeVisible()
  })

  test('单张图不显示对比区', async ({ page }) => {
    await expect(page.getByTestId('compare-area')).toHaveCount(0)
  })

  test('有尺寸对齐说明', async ({ page }) => {
    await expect(page.getByText(/按左图\/上图尺寸对齐/)).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片对比滑块')
    await page.getByText('图片对比滑块', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-slider/)
  })
})
