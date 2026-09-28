import { expect, test } from '@playwright/test'

test.describe('watermark-batch 图片水印批量 (#469)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/watermark-batch')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片水印批量/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-text')).toBeVisible()
    await expect(page.getByTestId('opt-position')).toBeVisible()
    await expect(page.getByTestId('opt-size')).toBeVisible()
    await expect(page.getByTestId('opt-color')).toBeVisible()
    await expect(page.getByTestId('opt-opacity')).toBeVisible()
    await expect(page.getByTestId('opt-angle')).toBeVisible()
    await expect(page.getByTestId('opt-tile')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
    await expect(page.getByTestId('process')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片水印批量')
    await page.getByText('图片水印批量', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/watermark-batch/)
  })
})
