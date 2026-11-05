@Entry
@ComponentV2
struct MotionPage {
  @Local scale: number = 1;

  build() {
    Column({ space: 16 }) {
      Row()
        .width(80).height(80).borderRadius(16)
        .backgroundColor($r('app.color.brand'))
        .scale({ x: this.scale, y: this.scale })
        .onClick(() => {
          animateTo({ duration: 300, curve: Curve.Standard }, () => {
            this.scale = this.scale === 1 ? 1.2 : 1;
          });
        })
      Text('点按方块看动效').fontSize(12).fontColor($r('app.color.font_secondary'))
    }.width('100%').height('100%').justifyContent(FlexAlign.Center)
  }
}
