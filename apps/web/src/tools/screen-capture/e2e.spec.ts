import { expect, test } from '@playwright/test'

test.describe('screen-capture 屏幕截取 (#463)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/screen-capture')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/屏幕截取/)
  })

  test('开始按钮与本地处理说明可见', async ({ page }) => {
    await expect(page.getByTestId('start')).toBeVisible()
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('屏幕截取')
    await page.getByText('屏幕截取', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/screen-capture/)
  })

  // 交互用例需要真实的系统级屏幕共享权限（浏览器会弹出系统授权框选择屏幕/窗口），
  // CI 环境无法提供，故跳过；仅保留标题/说明等静态断言。
  test.skip('需真实屏幕共享权限，CI 跳过', async ({ page }) => {
    await page.getByTestId('start').click()
    await expect(page.getByTestId('preview-video')).toBeVisible()
    await page.getByTestId('capture').click()
    await expect(page.getByTestId('result')).toBeVisible()
    await expect(page.getByTestId('download')).toBeVisible()
  })
})
