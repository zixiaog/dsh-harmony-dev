@Entry
@ComponentV2
struct ThemeSwitchPage {
  @Local followSystem: boolean = true;
  @Local dark: boolean = false;

  private apply(dark: boolean) {
    this.getUIContext().getHostContext()
      ?.getApplicationContext()
      .setColorMode(dark ? ColorMode.DARK : ColorMode.LIGHT);
  }

  build() {
    Column({ space: 16 }) {
      Text('外观').fontSize(20).fontWeight(FontWeight.Bold)
      Row({ space: 12 }) {
        Text('跟随系统').fontSize(16); Blank()
        Toggle({ type: ToggleType.Switch, isOn: this.followSystem })
          .onChange((on: boolean) => { this.followSystem = on; })
      }.height(56)
      Row({ space: 12 }) {
        Text('深色模式').fontSize(16); Blank()
        Toggle({ type: ToggleType.Switch, isOn: this.dark })
          .onChange((on: boolean) => { this.dark = on; if (!this.followSystem) this.apply(on); })
      }.height(56)
    }
    .padding({ left: 16, right: 16, top: 16 })
  }
}
