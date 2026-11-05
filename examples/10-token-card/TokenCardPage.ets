@ComponentV2
struct TokenCard {
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
      Image($r('app.media.chevron_right')).width(24).height(24)
    }
    .height(72).padding({ left: 16, right: 16 })
    .borderRadius(16)
    .backgroundColor($r('app.color.background_primary'))
    .onClick(this.onTap)
  }
}

@Entry
@ComponentV2
struct TokenCardPage {
  build() {
    Column({ space: 12 }) {
      TokenCard({ title: '卡片标题', subtitle: '副标题说明' })
      TokenCard({ title: '第二张卡片', subtitle: '间距与圆角全部走 token' })
    }.padding(16)
  }
}
