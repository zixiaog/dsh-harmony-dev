@Entry
@ComponentV2
struct SplitPage {
  @Local isWide: boolean = false;
  @Local pathStack: NavPathStack = new NavPathStack();

  build() {
    Navigation(this.pathStack) {
      if (this.isWide) {
        Row() {
          List() { ListItem() { Text('会话列表').height(56) } }.width(320)
          Divider().vertical(true)
          Column() { Text('详情区').fontSize(16) }.layoutWeight(1)
        }
      } else {
        List() {
          ListItem() { Text('会话列表').height(56) }
            .onClick(() => this.pathStack.pushPath({ name: 'detail' }))
        }
      }
    }
    .mode(NavigationMode.Auto)
  }
}
