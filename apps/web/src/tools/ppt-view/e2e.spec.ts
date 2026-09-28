/**
 * ppt-view E2E（Playwright）
 *
 * 只编写、不在当前环境执行（浏览器未安装，见任务说明）。
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * fixture：与 Tool.test.tsx 中 PPTX_DEMO 同构的最小 pptx
 * （两张幻灯片：slide1 文本「标题一 / 要点 <1>」，slide2 空白）。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

/** 最小 pptx fixture（base64） */
const PPTX_DEMO =
  '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'

test.describe('ppt-view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ppt-view')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PPT 幻灯片预览/)
  })

  test('文件入口存在', async ({ page }) => {
    await expect(page.getByTestId('file')).toBeAttached()
  })

  test('上传 pptx → 逐张文本预览与切换', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      buffer: Buffer.from(PPTX_DEMO, 'base64'),
    })

    // 第一张幻灯片：标题与段落
    await expect(page.getByTestId('slide-content')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('slide-counter')).toContainText('第 1 / 2 张')
    await expect(page.getByTestId('slide-content')).toContainText('标题一')
    await expect(page.getByTestId('slide-content')).toContainText('要点 <1>')

    // 切换到第二张：空白幻灯片标注
    await page.getByTestId('next-slide').click()
    await expect(page.getByTestId('slide-counter')).toContainText('第 2 / 2 张')
    await expect(page.getByTestId('slide-content')).toContainText('空白幻灯片')

    // 切回第一张
    await page.getByTestId('prev-slide').click()
    await expect(page.getByTestId('slide-counter')).toContainText('第 1 / 2 张')
  })

  test('上传损坏文件 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'bad.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      buffer: Buffer.from([1, 2, 3]),
    })
    await expect(page.getByTestId('ppt-error')).toContainText('文件解析失败', { timeout: 15000 })
  })

  test('上传旧版 .ppt → 专门提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'old.ppt',
      mimeType: 'application/vnd.ms-powerpoint',
      buffer: Buffer.from('fake'),
    })
    await expect(page.getByTestId('ppt-error')).toContainText('暂不支持旧版 .ppt', {
      timeout: 15000,
    })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ppt-view')
    await page.getByText('PPT 幻灯片预览').first().click()
    await expect(page).toHaveURL(/\/tools\/ppt-view$/)
  })
})
