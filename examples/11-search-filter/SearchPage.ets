@Entry
@ComponentV2
struct SearchPage {
  @Local query: string = '';
  @Local items: string[] = ['支持无障碍', '分栏布局', '懒加载列表', '深色模式'];
  @Local filtered: string[] = [];

  private filter(value: string) {
    this.query = value;
    this.filtered = value.length === 0 ? [] : this.items.filter((item) => item.includes(value));
  }

  build() {
    Column({ space: 12 }) {
      Search({ placeholder: '搜索设置项' }).onChange((value: string) => this.filter(value))
      List({ space: 8 }) {
        ForEach(this.filtered, (item: string) => {
          ListItem() { Text(item).height(56).padding({ left: 16 }) }
        }, (item: string) => item)
      }.layoutWeight(1)
    }.padding({ left: 16, right: 16, top: 12 })
  }
}
