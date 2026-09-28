import { expect, test } from '@playwright/test'

test.describe('camera-snapshot 相机拍照 (#465)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/camera-snapshot')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/相机拍照/)
  })

  test('打开按钮与选项可见', async ({ page }) => {
    await expect(page.getByTestId('open')).toBeVisible()
    await expect(page.getByTestId('opt-facing')).toBeVisible()
    await expect(page.getByTestId('opt-mirror')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  // 交互用例需要真实摄像头与用户授权，CI 环境无设备，此处跳过；
  // 静态断言保留，保证页面可达与基础结构正确。
  test.skip('需真实摄像头权限，CI 跳过', async ({ page }) => {
    await page.getByTestId('open').click()
    await expect(page.getByTestId('preview-video')).toBeVisible()
    await page.getByTestId('snap').click()
    await expect(page.getByTestId('result')).toBeVisible()
    await expect(page.getByTestId('download')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('相机拍照')
    await page.getByText('相机拍照', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/camera-snapshot/)
  })
})
