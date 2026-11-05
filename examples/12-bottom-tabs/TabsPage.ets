@Entry
@ComponentV2
struct TabsPage {
  @Local index: number = 0;

  build() {
    Tabs({ barPosition: BarPosition.End, index: this.index }) {
      TabContent() { Text('首页').fontSize(20) }.tabBar('首页')
      TabContent() { Text('发现').fontSize(20) }.tabBar('发现')
      TabContent() { Text('我的').fontSize(20) }.tabBar('我的')
    }
    .onChange((index: number) => { this.index = index; })
    .width('100%').height('100%')
  }
}
