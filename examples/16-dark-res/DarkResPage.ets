@Entry
@ComponentV2
struct DarkResPage {
  build() {
    Column({ space: 12 }) {
      Text('一级文本').fontSize(20).fontColor($r('app.color.font_primary'))
      Text('二级文本').fontSize(16).fontColor($r('app.color.font_secondary'))
      Text('说明文本').fontSize(12).fontColor($r('app.color.font_tertiary'))
      Blank()
    }
    .width('100%').height('100%').padding(16)
    .backgroundColor($r('app.color.background_primary'))
  }
}
