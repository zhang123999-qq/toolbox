import { expect, test } from '@playwright/test'

test.describe('color-picker 屏幕取色器 (#466)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/color-picker')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/取色/)
  })

  test('取色按钮与图片投放区可见（Chromium 提供 EyeDropper）', async ({ page }) => {
    await expect(page.getByTestId('eyedropper-btn')).toBeVisible()
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('manual-hex')).toBeVisible()
  })

  test('手动输入色值可得 HEX / RGB / HSL 结果', async ({ page }) => {
    await page.getByTestId('manual-hex').fill('#ff0000')
    await page.getByTestId('manual-apply').click()
    await expect(page.getByTestId('result')).toBeVisible()
    await expect(page.getByTestId('swatch')).toBeVisible()
    await expect(page.getByTestId('hex')).toContainText('#ff0000')
    await expect(page.getByTestId('rgb')).toContainText('rgb(255, 0, 0)')
    await expect(page.getByTestId('hsl')).toContainText('hsl(0, 100%, 50%)')
  })

  test('手动输入非法值报错', async ({ page }) => {
    await page.getByTestId('manual-hex').fill('xyz')
    await page.getByTestId('manual-apply').click()
    await expect(page.getByTestId('error')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('取色')
    await page.getByText('屏幕取色器', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/color-picker/)
  })

  // EyeDropper.open() 会弹出系统级取色框，需要人工在屏幕上点选颜色，
  // 无头 CI 环境无法完成交互，故跳过；本地 Chromium 可手动取消 skip 验证。
  test.skip('EyeDropper 真实系统取色（需人工操作）', async ({ page }) => {
    await page.getByTestId('eyedropper-btn').click()
    await expect(page.getByTestId('result')).toBeVisible({ timeout: 60_000 })
  })
})
