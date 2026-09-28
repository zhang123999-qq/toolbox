import { expect, test } from '@playwright/test'

test.describe('screen-record 屏幕录制 (#464)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/screen-record')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/屏幕录制/)
  })

  test('开始按钮与选项可见', async ({ page }) => {
    await expect(page.getByTestId('start')).toBeVisible()
    await expect(page.getByTestId('opt-codec')).toBeVisible()
    await expect(page.getByTestId('opt-audio')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('屏幕录制')
    await page.getByText('屏幕录制', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/screen-record/)
  })

  // 交互用例：点击"开始录制" → 浏览器弹出屏幕共享选择器（需人工选择窗口/屏幕并授权）→
  // 录制中显示计时器与预览 → 点击"停止" → 生成 webm 并可下载。
  // CI 无显示服务器且无法完成人工授权，故跳过；保留上面静态断言覆盖页面结构。
  test.skip('需真实屏幕共享权限，CI 跳过', async () => {})
})
