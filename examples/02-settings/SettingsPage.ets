@Entry
@ComponentV2
struct SettingsPage {
  @Local darkMode: boolean = false;
  @Local notificationOn: boolean = true;

  build() {
    Column() {
      Text('设置').fontSize(24).fontWeight(FontWeight.Bold)
        .width('100%').padding({ left: 16, top: 16, bottom: 8 })
      List() {
        ListItem() {
          Row({ space: 12 }) {
            Text('深色模式').fontSize(16)
            Blank()
            Toggle({ type: ToggleType.Switch, isOn: this.darkMode })
              .onChange((on: boolean) => { this.darkMode = on; })
          }.height(56).padding({ left: 16, right: 16 })
        }
        ListItem() {
          Row({ space: 12 }) {
            Text('通知').fontSize(16)
            Blank()
            Toggle({ type: ToggleType.Switch, isOn: this.notificationOn })
              .onChange((on: boolean) => { this.notificationOn = on; })
          }.height(56).padding({ left: 16, right: 16 })
        }
      }
      .divider({ strokeWidth: 1, color: $r('app.color.comp_divider') })
      .width('100%')
    }
    .width('100%').height('100%')
    .backgroundColor($r('app.color.background_primary'))
  }
}
