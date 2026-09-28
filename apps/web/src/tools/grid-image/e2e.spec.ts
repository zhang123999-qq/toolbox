import { expect, test } from '@playwright/test'

test.describe('grid-image 九宫格切图 (#441)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/grid-image')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/九宫格/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-rows')).toBeVisible()
    await expect(page.getByTestId('opt-cols')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
    await expect(page.getByTestId('opt-quality')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('九宫格切图')
    await page.getByText('九宫格切图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/grid-image/)
  })
})
