class ImageSource implements IDataSource {
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
struct ImageListPage {
  @Local source: ImageSource = new ImageSource(['cover1', 'cover2', 'cover3']);

  build() {
    List({ space: 8 }) {
      LazyForEach(this.source, (item: string) => {
        ListItem() {
          Image($r(`app.media.${item}`))
            .width('100%').height(160)
            .objectFit(ImageFit.Cover)
            .borderRadius(16)
            .accessibilityText('封面图')
        }
      }, (item: string) => item)
    }.padding(16)
  }
}
