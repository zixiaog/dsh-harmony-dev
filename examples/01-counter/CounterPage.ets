@Entry
@ComponentV2
struct CounterPage {
  @Local count: number = 0;

  build() {
    Column({ space: 16 }) {
      Text('计数器').fontSize(24).fontWeight(FontWeight.Bold)
      Row({ space: 12 }) {
        Button('-')
          .width(56).height(40)
          .borderRadius(20)
          .onClick(() => { if (this.count > 0) this.count--; })
        Text(`${this.count}`).fontSize(20)
        Button('+')
          .width(56).height(40)
          .borderRadius(20)
          .backgroundColor($r('app.color.brand'))
          .onClick(() => { this.count++; })
      }
    }
    .width('100%').height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor($r('app.color.background_primary'))
  }
}
