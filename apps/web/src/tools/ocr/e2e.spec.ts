import { expect, test } from '@playwright/test'

test.describe('ocr 图片文字识别 (#446)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/ocr')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/图片文字识别/)
  })

  test('投放区与语言选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-chiSim')).toBeVisible()
    await expect(page.getByTestId('opt-eng')).toBeVisible()
  })

  test('CDN 与隐私说明显著可见', async ({ page }) => {
    const notice = page.getByTestId('cdn-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText(/CDN/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('OCR 图片文字识别')
    await page.getByText('OCR 图片文字识别', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/ocr/)
  })
})
