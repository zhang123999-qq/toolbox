import { expect, test } from '@playwright/test'

test.describe('svg-optimize-img SVG 优化压缩 (#452)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/svg-optimize-img')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/SVG 优化压缩/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-multipass')).toBeVisible()
    await expect(page.getByTestId('opt-pretty')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('SVG 优化压缩')
    await page.getByText('SVG 优化压缩', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/svg-optimize-img/)
  })
})
