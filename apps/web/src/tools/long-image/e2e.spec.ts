import { expect, test } from '@playwright/test'

test.describe('long-image 长图拼接 (#440)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/long-image')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/长图拼接/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-widthMode')).toBeVisible()
    await expect(page.getByTestId('opt-align')).toBeVisible()
    await expect(page.getByTestId('opt-gap')).toBeVisible()
    await expect(page.getByTestId('opt-bgColor')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('长图拼接')
    await page.getByText('长图拼接', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/long-image/)
  })
})
