import { expect, test } from '@playwright/test'

test.describe('id-photo 证件照制作 (#459)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/id-photo')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/证件照/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-spec')).toBeVisible()
    await expect(page.getByTestId('opt-dpi')).toBeVisible()
    await expect(page.getByTestId('opt-bg')).toBeVisible()
    await expect(page.getByTestId('opt-scale')).toBeVisible()
    await expect(page.getByTestId('opt-layout')).toBeVisible()
  })

  test('自定义规格显示宽高输入', async ({ page }) => {
    await page.getByTestId('opt-spec').selectOption('custom')
    await expect(page.getByTestId('opt-customw')).toBeVisible()
    await expect(page.getByTestId('opt-customh')).toBeVisible()
  })

  test('自定义底色显示颜色选择器', async ({ page }) => {
    await page.getByTestId('opt-bg').selectOption('custom')
    await expect(page.getByTestId('opt-custombg')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('证件照')
    await page.getByText('证件照制作', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/id-photo/)
  })
})
