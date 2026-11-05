class ItemSource implements IDataSource {
  private items: string[] = [];
  private listeners: DataChangeListener[] = [];

  constructor(items: string[]) { this.items = items; }

  totalCount(): number { return this.items.length; }
  getData(index: number): string { return this.items[index]; }

  registerDataChangeListener(listener: DataChangeListener): void {
    if (this.listeners.indexOf(listener) < 0) this.listeners.push(listener);
  }
  unregisterDataChangeListener(listener: DataChangeListener): void {
    const i = this.listeners.indexOf(listener);
    if (i >= 0) this.listeners.splice(i, 1);
  }
}

@Entry
@ComponentV2
struct ListPage {
  @Local refreshing: boolean = false;
  @Local source: ItemSource = new ItemSource(['条目 1', '条目 2', '条目 3']);

  build() {
    Refresh({ refreshing: this.refreshing }) {
      List({ space: 8 }) {
        LazyForEach(this.source, (item: string, index: number) => {
          ListItem() {
            Text(item).fontSize(16).height(56).padding({ left: 16 })
          }
        }, (item: string) => item)
      }
      .width('100%').height('100%')
    }
    .onRefreshing(() => {
      this.refreshing = true;
      setTimeout(() => { this.refreshing = false; }, 800);
    })
  }
}
