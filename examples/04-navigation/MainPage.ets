@Entry
@ComponentV2
struct MainPage {
  @Local pathStack: NavPathStack = new NavPathStack();

  @Builder
  pageMap(name: string) {
    if (name === 'detail') {
      NavDestination() {
        Column() { Text('详情页').fontSize(20) }
          .width('100%').height('100%').justifyContent(FlexAlign.Center)
      }.title('详情')
    }
  }

  build() {
    Navigation(this.pathStack) {
      Column({ space: 16 }) {
        Text('首页').fontSize(24).fontWeight(FontWeight.Bold)
        Button('打开详情').onClick(() => {
          this.pathStack.pushPath({ name: 'detail', param: { id: '1' } });
        })
      }
      .width('100%').height('100%').justifyContent(FlexAlign.Center)
    }
    .navDestination(this.pageMap)
    .mode(NavigationMode.Auto)
  }
}
