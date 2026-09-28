import { expect, test } from '@playwright/test'

test.describe('image-round 圆角图片 (#429)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-round')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/圆角图片/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-mode')).toBeVisible()
    await expect(page.getByTestId('opt-radius')).toBeVisible()
    await expect(page.getByTestId('opt-background')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('圆形模式下半径输入禁用', async ({ page }) => {
    await page.getByTestId('opt-mode').selectOption('circle')
    await expect(page.getByTestId('opt-radius')).toBeDisabled()
  })

  test('透明背景 + JPEG 显示提示', async ({ page }) => {
    await page.getByTestId('opt-format').selectOption('jpeg')
    await expect(page.getByTestId('jpeg-hint')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('圆角图片')
    await page.getByText('圆角图片', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-round/)
  })
})
