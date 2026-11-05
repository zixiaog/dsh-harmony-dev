@ComponentV2
struct HomeCard {
  @Param title: string = '';
  @Param subtitle: string = '';
  @Event onTap: () => void = () => {};

  build() {
    Row({ space: 12 }) {
      Column({ space: 2 }) {
        Text(this.title).fontSize(16).fontWeight(FontWeight.Medium)
        Text(this.subtitle).fontSize(12).fontColor($r('app.color.font_secondary'))
      }.alignItems(HorizontalAlign.Start)
      Blank()
    }
    .height(72).padding({ left: 16, right: 16 })
    .borderRadius(16)
    .backgroundColor($r('app.color.background_primary'))
    .onClick(this.onTap)
  }
}

@Entry
@ComponentV2
struct HomePage {
  build() {
    List({ space: 12 }) {
      ForEach(['组件卡', '页面模板', '规范速查'], (item: string) => {
        ListItem() {
          HomeCard({ title: item, subtitle: '点击进入' })
        }
      }, (item: string) => item)
    }.padding(16)
  }
}
