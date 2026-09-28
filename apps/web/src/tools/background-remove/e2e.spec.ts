import { expect, test } from '@playwright/test'

test.describe('background-remove 背景移除 (#457)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/background-remove')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/背景移除/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-mode')).toBeVisible()
    await expect(page.getByTestId('opt-tolerance')).toBeVisible()
  })

  test('默认边缘抠除模式不显示取色器，切换色度键后显示', async ({ page }) => {
    await expect(page.getByTestId('opt-color')).toHaveCount(0)
    await page.getByTestId('opt-mode').selectOption('chroma')
    await expect(page.getByTestId('opt-color')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('背景移除')
    await page.getByText('背景移除', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/background-remove/)
  })
})
