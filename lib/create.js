/**
 * harmony_create：在磁盘上生成可被 DevEco 打开的 Stage 模型工程骨架。
 *
 * 约定：
 * - 默认生成到 <cwd>/harmony-projects/<name>
 * - 目标目录非空时必须 force=true
 * - 只写骨架，不做编译/签名（方案边界）
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#0A59F7"/>
  <rect x="28" y="28" width="30" height="30" rx="9" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <rect x="70" y="28" width="30" height="30" rx="15" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <rect x="28" y="70" width="30" height="30" rx="15" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <path d="M70 85h30" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
</svg>
`;

const tokens = `// 由 harmony-dev-kit 生成：所有颜色/字号/间距/圆角/动效一律走 token。
export class Color {
  static readonly brand = '#0A59F7';
  static readonly brand_light = '#317AF7';
  static readonly font_primary = '#E5E5E5';
  static readonly font_secondary = '#99A1A1';
  static readonly background_primary = '#000000';
  static readonly alert = '#EF4B4B';
}

export class Font {
  static readonly Title_S = { size: 20, weight: 500 };
  static readonly Subtitle_M = { size: 16, weight: 400 };
  static readonly Body_M = { size: 14, weight: 400 };
  static readonly Caption_M = { size: 12, weight: 400 };
}

export class Space {
  static readonly screenMarginPhone = 16;
  static readonly gapLarge = 16;
  static readonly gapNormal = 8;
  static readonly cardGap = 12;
  static readonly textGapV = 2;
  static readonly textGapH = 8;
}

export class Radius {
  static readonly card = 16;
  static readonly button = 20;
  static readonly image = 8;
}

export class Motion {
  static readonly fast = 100;
  static readonly standard = 300;
  static readonly spring = 'cubic-bezier(0.40, 0, 0.20, 1)';
}
`;

const indexBody = {
  empty: `@Entry
@ComponentV2
struct Index {
  build() {
    Column({ space: Space.gapLarge }) {
      Text('Hello HarmonyOS').fontSize(Font.Title_S.size).fontColor(Color.font_primary)
      Text('这是 harmony-dev-kit 生成的工程骨架').fontSize(Font.Body_M.size).fontColor(Color.font_secondary)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor(Color.background_primary)
  }
}`,
  tabs: `@Entry
@ComponentV2
struct Index {
  @Local index: number = 0

  build() {
    Tabs({ barPosition: BarPosition.End, index: this.index }) {
      TabContent() { Text('首页').fontSize(Font.Title_S.size) }.tabBar('首页')
      TabContent() { Text('发现').fontSize(Font.Title_S.size) }.tabBar('发现')
      TabContent() { Text('我的').fontSize(Font.Title_S.size) }.tabBar('我的')
    }
    .onChange((index: number) => { this.index = index })
    .width('100%')
    .height('100%')
  }
}`,
  list: `@Entry
@ComponentV2
struct Index {
  @Local items: string[] = ['列表项 1', '列表项 2', '列表项 3']

  build() {
    List({ space: Space.gapNormal }) {
      ForEach(this.items, (item: string) => {
        ListItem() {
          Text(item).fontSize(Font.Body_M.size).fontColor(Color.font_primary)
            .height(56)
            .padding({ left: Space.screenMarginPhone })
        }
        .backgroundColor(Color.background_primary)
      }, (item: string) => item)
    }
    .width('100%')
    .height('100%')
    .divider({ strokeWidth: 1, color: Color.font_secondary })
  }
}`,
  settings: `@Entry
@ComponentV2
struct Index {
  @Local darkMode: boolean = false
  @Local notifications: boolean = true

  build() {
    Column() {
      Text('设置').fontSize(Font.Title_S.size).fontColor(Color.font_primary)
        .width('100%')
        .padding({ left: Space.screenMarginPhone, top: Space.gapLarge, bottom: Space.gapNormal })
      List({ space: Space.gapNormal }) {
        ListItem() {
          Row() {
            Text('深色模式').fontSize(Font.Body_M.size).fontColor(Color.font_primary)
            Blank()
            Toggle({ type: ToggleType.Switch, isOn: this.darkMode })
              .onChange((value: boolean) => { this.darkMode = value })
          }
          .padding({ left: Space.screenMarginPhone, right: Space.screenMarginPhone })
          .height(56)
        }
        ListItem() {
          Row() {
            Text('通知').fontSize(Font.Body_M.size).fontColor(Color.font_primary)
            Blank()
            Toggle({ type: ToggleType.Switch, isOn: this.notifications })
              .onChange((value: boolean) => { this.notifications = value })
          }
          .padding({ left: Space.screenMarginPhone, right: Space.screenMarginPhone })
          .height(56)
        }
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.background_primary)
  }
}`,
};

const safeName = (name) => {
  if (!/^[A-Za-z][A-Za-z0-9_-]{1,40}$/.test(name)) {
    throw new Error('name 需以字母开头，2~41 位字母/数字/下划线/中划线');
  }
  return name;
};

export function createProject({ name, path, template = 'empty', bundleName, targetApi = '6.1.1(24)', force = false } = {}) {
  try {
    const projectName = safeName(String(name ?? ''));
    if (!['empty', 'tabs', 'list', 'settings'].includes(template)) {
      throw new Error(`template 必须是 empty/tabs/list/settings，收到 ${template}`);
    }
    const root = path ? resolve(String(path)) : resolve(process.cwd(), 'harmony-projects', projectName);
    if (existsSync(root) && readdirSync(root).length > 0 && !force) {
      return { ok: false, error: `目标目录已存在且非空：${root}（需要覆盖请传 force:true）` };
    }
    const bundle = bundleName ?? `com.example.${projectName.toLowerCase().replace(/[-_]/g, '')}`;
    const moduleName = 'entry';

    const files = {
      'README.md': `# ${projectName}

由 harmony-dev-kit 生成（Stage 模型骨架，API 基线 ${targetApi}）。

## 打开与运行

1. DevEco Studio → Open → 选择本目录
2. 等待 hvigor Sync（首次会装依赖）
3. 配置签名：File → Project Structure → Signing Configs → Automatically generate signature（需登录华为账号）
4. 运行到模拟器/真机

## 结构

- AppScope/            应用级配置
- entry/               主模块（UIAbility + 页面）
- entry/src/main/ets/pages/Index.ets   首页（模板：${template}）
- entry/src/main/ets/common/Tokens.ets 设计 token

## 说明

- 颜色/字号/间距/圆角/动效全部走 Tokens，不要写魔法值
- 生成器不负责编译/签名/上架
`,
      'AppScope/app.json5': `{
  "app": {
    "bundleName": ${JSON.stringify(bundle)},
    "vendor": "example",
    "versionCode": 1000000,
    "versionName": "1.0.0",
    "icon": "$media:app_icon",
    "label": "$string:app_name"
  }
}
`,
      'AppScope/resources/base/element/string.json': JSON.stringify(
        { string: [{ name: 'app_name', value: projectName }] },
        null,
        2,
      ) + '\n',
      'AppScope/resources/base/media/app_icon.svg': svgIcon,
      'build-profile.json5': `{
  "app": {
    "signingConfigs": [],
    "products": [
      {
        "name": "default",
        "signingConfig": "default",
        "compatibleSdkVersion": ${JSON.stringify(targetApi)},
        "runtimeOS": "HarmonyOS"
      }
    ],
    "buildModeSet": [{ "name": "debug" }, { "name": "release" }]
  },
  "modules": [
    {
      "name": ${JSON.stringify(moduleName)},
      "srcPath": "./${moduleName}",
      "targets": [{ "name": "default", "applyToProducts": ["default"] }]
    }
  ]
}
`,
      'hvigorfile.ts': `import { appTasks } from '@ohos/hvigor-ohos-plugin';

export default {
  system: appTasks,
  plugins: []
};
`,
      'oh-package.json5': `{
  "modelVersion": "5.0.0",
  "description": ${JSON.stringify(projectName)},
  "dependencies": {},
  "devDependencies": {
    "@ohos/hypium": "1.0.19"
  }
}
`,
      'hvigor/hvigor-config.json5': `{
  "modelVersion": "5.0.0",
  "dependencies": {}
}
`,
      '.gitignore': `node_modules/
oh_modules/
build/
.hvigor/
.idea/
*.har
*.hap
local.properties
`,
      [`${moduleName}/build-profile.json5`]: `{
  "apiType": "stageMode",
  "buildOption": {},
  "targets": [{ "name": "default" }, { "name": "ohosTest" }]
}
`,
      [`${moduleName}/hvigorfile.ts`]: `import { hapTasks } from '@ohos/hvigor-ohos-plugin';

export default {
  system: hapTasks,
  plugins: []
};
`,
      [`${moduleName}/oh-package.json5`]: `{
  "name": ${JSON.stringify(moduleName)},
  "version": "1.0.0",
  "description": "entry module",
  "main": "",
  "author": "",
  "license": "",
  "dependencies": {}
}
`,
      [`${moduleName}/src/main/module.json5`]: `{
  "module": {
    "name": ${JSON.stringify(moduleName)},
    "type": "entry",
    "description": "$string:module_desc",
    "mainElement": "EntryAbility",
    "deviceTypes": ["phone", "tablet", "2in1"],
    "deliveryWithInstall": true,
    "installationFree": false,
    "pages": "$profile:main_pages",
    "abilities": [
      {
        "name": "EntryAbility",
        "srcEntry": "./ets/entryability/EntryAbility.ets",
        "description": "$string:EntryAbility_desc",
        "icon": "$media:icon",
        "label": "$string:EntryAbility_label",
        "startWindowIcon": "$media:icon",
        "startWindowBackground": "$color:start_window_background",
        "exported": true,
        "skills": [
          {
            "entities": ["entity.system.home"],
            "actions": ["action.system.home"]
          }
        ]
      }
    ]
  }
}
`,
      [`${moduleName}/src/main/ets/entryability/EntryAbility.ets`]: `import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index');
  }

  onWindowStageDestroy(): void {
  }
}
`,
      [`${moduleName}/src/main/ets/common/Tokens.ets`]: tokens,
      [`${moduleName}/src/main/ets/pages/Index.ets`]: `import { Color, Font, Space } from '../common/Tokens';

${indexBody[template]}
`,
      [`${moduleName}/src/main/resources/base/element/string.json`]: JSON.stringify(
        {
          string: [
            { name: 'module_desc', value: 'entry module' },
            { name: 'EntryAbility_desc', value: 'entry ability' },
            { name: 'EntryAbility_label', value: projectName },
          ],
        },
        null,
        2,
      ) + '\n',
      [`${moduleName}/src/main/resources/base/element/color.json`]: JSON.stringify(
        { color: [{ name: 'start_window_background', value: '#000000' }] },
        null,
        2,
      ) + '\n',
      [`${moduleName}/src/main/resources/base/profile/main_pages.json`]: JSON.stringify(
        { src: ['pages/Index'] },
        null,
        2,
      ) + '\n',
      [`${moduleName}/src/main/resources/base/media/icon.svg`]: svgIcon,
    };

    for (const [relative, content] of Object.entries(files)) {
      const target = join(root, relative);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, 'utf8');
    }

    return {
      ok: true,
      data: {
        root,
        bundleName: bundle,
        template,
        targetApi,
        files: Object.keys(files).sort(),
        fileCount: Object.keys(files).length,
        nextSteps: [
          'DevEco Studio → Open 该目录，等待 hvigor Sync',
          'Project Structure → Signing Configs 自动签名',
          '运行到模拟器/真机',
          '后续页面用 harmony_build page 生成，改完用 harmony_check review',
        ],
      },
      citations: [],
      warnings: ['生成器不执行编译/签名；首次 Sync 需联网安装 hvigor 依赖'],
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
