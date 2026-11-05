@Entry
@ComponentV2
struct ThemePage {
  @Local isDark: boolean = false;

  build() {
    Column({ space: 16 }) {
      Text('主题演示').fontSize(24).fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.font_primary'))
      Text('正文使用二级文本色').fontSize(16)
        .fontColor($r('app.color.font_secondary'))
      Row({ space: 12 }) {
        Text('深色模式').fontSize(16).fontColor($r('app.color.font_primary'))
        Toggle({ type: ToggleType.Switch, isOn: this.isDark })
          .onChange((on: boolean) => { this.isDark = on; })
      }
    }
    .width('100%').height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor($r('app.color.background_primary'))
  }
}
