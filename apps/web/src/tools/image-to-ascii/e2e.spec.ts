import { expect, test } from '@playwright/test'

test.describe('image-to-ascii 图片转 ASCII (#451)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-to-ascii')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/ASCII/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-width')).toBeVisible()
    await expect(page.getByTestId('opt-charset')).toBeVisible()
    await expect(page.getByTestId('opt-invert')).toBeVisible()
    await expect(page.getByTestId('opt-color')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('图片转 ASCII')
    await page.getByText('图片转 ASCII', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-to-ascii/)
  })
})
