/**
 * 最后一层兜底：为官方抓取失败的参考页锚点补一句准确的能力说明（本地补写）。
 * 只影响 kits.json 中仍以「官方章节：」开头的主题。
 *
 * 运行：node scripts/patch_kit_topic_fallback.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = join(ROOT, 'content', 'topics', 'kits.json');
const store = JSON.parse(readFileSync(PATH, 'utf8'));

const FALLBACK = {
  'crypto_architecture_kit.h':
    'C API 头文件，提供哈希、加解密、签名验签等基础密码学接口，供 NDK 侧调用；按算法选择对应函数族，密钥管理配合 HUKS。',
  AVPlaybackState:
    '描述媒体会话当前播放状态的类：播放/暂停、进度、播放速度、循环模式等；用于跨设备播控同步与状态回传。',
  媒体会话管理错误码:
    'AVSession 的 BusinessError 错误码表，覆盖参数非法、会话不存在、权限不足等失败场景，用于分支判定与提示文案。',
  AVMetadata:
    '媒体元数据（标题、作者、专辑、封面、时长等），随播放状态同步到系统播控中心，保证锁屏/控制中心显示一致。',
  ScanType: '扫码类型枚举（二维码、条形码等），决定解码格式与识别策略；与 ScanSource 配合选择相机或图片输入。',
  decodeImage: '从图片解码条码/二维码的接口：传入 PixelMap 返回识别结果数组，适合相册选图识别与批量处理。',
  ScanSource: '扫码输入来源（相机预览 / 图片文件），决定预览生命周期与识别流程；相机来源需先申请相机权限。',
  ViewControl: '扫码界面的视图控制：闪光灯、缩放、相册入口、扫描框样式等，按业务场景裁剪而非全开。',
  '@ohos.bluetooth.access': '蓝牙开关与可用性访问模块：查询蓝牙是否开启、订阅状态变化，其他蓝牙模块的前置判断。',
  '@ohos.bluetooth.connection': '蓝牙连接管理：查询已配对/已连接设备、监听连接状态变化，用于设备列表与重连策略。',
  '@ohos.bluetooth.ble': '低功耗蓝牙（BLE）：扫描、连接、GATT 服务发现与读写/通知，适合手环、传感器等外设。',
  '@ohos.bluetooth.socket': '经典蓝牙 Socket（SPP）通信：建立串口式数据通道，适合打印机、POS 机等流式传输场景。',
  '@ohos.bluetooth.a2dp': 'A2DP 音频输出协议：查询音频设备连接与编码状态，用于音频路由与设备切换提示。',
  '@ohos.bluetooth.hfp': 'HFP 免提协议：处理通话音频路由与免提设备状态，配合音频焦点管理使用。',
  '@ohos.bluetooth.hid': 'HID 人机接口设备：键鼠等外设的连接管理与事件分发，注意输入焦点与快捷键冲突。',
  '@ohos.bluetooth.pan': 'PAN 蓝牙网络共享：通过蓝牙接入网络，适合无 Wi-Fi 场景；需判断网络类型与计费策略。',
  '@ohos.bluetooth.map': 'MAP 消息访问协议：同步手机消息到车机等设备，涉及用户隐私，需权限与告知。',
  '@ohos.bluetooth.pbap': 'PBAP 电话簿访问协议：同步联系人到车机等设备，读取范围需最小化并做脱敏。',
  '@ohos.wifiManager (WLAN)': 'WLAN 管理：开关、扫描、连接与状态监听；扫描结果用于网络选择 UI，注意频繁扫描的功耗与权限。',
};

let patched = 0;
for (const kit of Object.values(store.kits)) {
  for (const topic of kit.topics) {
    if (!String(topic.content ?? '').startsWith('官方章节：')) continue;
    const text = FALLBACK[String(topic.title).trim()];
    if (!text) continue;
    topic.content = text;
    topic.enriched = false;
    topic.note = '本地补写（官方正文未自动抽取）';
    patched += 1;
  }
}
writeFileSync(PATH, JSON.stringify(store, null, 2), 'utf8');
console.log(`本地补写 ${patched} 条`);
