# 推广图（9:16 竖版）

6 张 `1080 × 1920` 推广图，外加一张 `_overview.png` 总览拼图。

| 文件 | 主题 |
| --- | --- |
| `01-cover.png` | 封面：名称 / 定位 / 5 工具 / 关键数据 / 安装命令 |
| `02-tools.png` | 五个工具与各自能力 |
| `03-library.png` | 内容库构成与覆盖范围 |
| `04-version.png` | 版本能力：旧格式与 SemVer、apidiff、基线过滤 |
| `05-install.png` | 三种安装方式与安装后验证 |
| `06-scenarios.png` | 适用场景与最终安装入口 |

## 重新生成

源文件为 `index.html?n=1..6` + `style.css` + `cards.js`（纯静态，无需构建）。用无头浏览器按 1080×1920 截图即可，例如 Windows 上的 Edge：

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$dir  = (Resolve-Path .).Path
$tmp  = Join-Path $env:TEMP 'edge-headless-profile'
$names = @{1='01-cover';2='02-tools';3='03-library';4='04-version';5='05-install';6='06-scenarios'}
foreach ($n in 1..6) {
  & $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run --disable-extensions `
    --user-data-dir=$tmp --window-size=1080,1920 --virtual-time-budget=3000 `
    --screenshot="$dir\$($names[$n]).png" "file:///$($dir -replace '\\','/')/index.html?n=$n"
}
```

总览拼图（需要 Python + Pillow）：

```python
from PIL import Image
import os
d = '.'  # 本目录
names = ['01-cover','02-tools','03-library','04-version','05-install','06-scenarios']
tw, gap, cols = 500, 20, 3
imgs = [Image.open(os.path.join(d, n + '.png')) for n in names]
th = round(imgs[0].height * tw / imgs[0].width)
sheet = Image.new('RGB', (cols * tw + (cols + 1) * gap, 2 * th + 3 * gap), '#05070d')
for i, im in enumerate(imgs):
    r, c = divmod(i, cols)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (gap + c * (tw + gap), gap + r * (th + gap)))
sheet.save('_overview.png')
```
