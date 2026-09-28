# EXIF 查看 exif-view（#444）

## 用途 | Purpose

- 在本地读取图片的全部 EXIF 元数据并分类表格展示：拍摄参数（机型、光圈、快门、ISO、焦距、拍摄时间、闪光灯、曝光程序）、GPS 位置（纬度/经度/海拔，十进制 + 度分秒两种格式）、文件信息（文件名、大小、MIME、尺寸）、其他标签。
- Read all EXIF metadata of an image locally and show it in categorized tables: shooting params (camera, aperture, shutter, ISO, focal length, datetime, flash, exposure program), GPS (lat/lon/altitude in both decimal and DMS), file info (name, size, MIME, dimensions), and other tags.

## 输入 | Input

- 图片文件：JPEG / TIFF 为主，也接受 PNG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: JPEG/TIFF primarily, also PNG/WebP/GIF/BMP/AVIF, max 50MB per file.

## 输出 | Output

- 分类表格（键/值两列）：拍摄参数、位置信息、文件信息、其他标签；附图片预览。
- Categorized key/value tables: shooting params, GPS, file info, other tags; with image preview.

## 边界 | Limits

- 全程本地用 exifr 解析，不上传。
- 图片没有 EXIF（如截图、大多数 PNG/WebP）时显示友好提示而非报错。
- GPS 只做本地展示（十进制 + 度分秒），不提供外部地图链接。
- EXIF 时间按浏览器本地时区显示。

## 数据流向 | Data flow

文件 → 内存 exifr.parse → 纯函数分类/格式化 → 表格渲染；不经过网络。
