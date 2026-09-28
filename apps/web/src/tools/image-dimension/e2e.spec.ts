import { expect, test } from '@playwright/test'

test.describe('image-dimension 图片尺寸调整 (#472)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-dimension')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片尺寸调整/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-preset')).toBeVisible()
    await expect(page.getByTestId('opt-width')).toBeVisible()
    await expect(page.getByTestId('opt-height')).toBeVisible()
    await expect(page.getByTestId('opt-fit')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片尺寸调整')
    await page.getByText('图片尺寸调整', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-dimension/)
  })
})
