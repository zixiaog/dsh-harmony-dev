@Entry
@ComponentV2
struct DialogPage {
  @Local deleted: boolean = false;

  build() {
    Column({ space: 16 }) {
      Button('删除记录')
        .backgroundColor($r('app.color.alert'))
        .onClick(() => {
          AlertDialog.show({
            title: '删除这条记录？',
            message: '删除后不可恢复',
            primaryButton: { value: '取消', action: () => {} },
            secondaryButton: {
              value: '删除',
              fontColor: $r('app.color.alert'),
              action: () => { this.deleted = true; },
            },
          });
        })
      if (this.deleted) { Text('已删除').fontColor($r('app.color.font_secondary')) }
    }
  }
}
