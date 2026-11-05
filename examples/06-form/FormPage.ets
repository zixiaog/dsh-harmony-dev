@Entry
@ComponentV2
struct FormPage {
  @Local phone: string = '';
  @Local error: string = '';

  private validate(): boolean {
    if (this.phone.length !== 11) {
      this.error = '请输入 11 位手机号';
      return false;
    }
    this.error = '';
    return true;
  }

  build() {
    Column({ space: 12 }) {
      Text('手机号').fontSize(16)
      TextInput({ placeholder: '请输入手机号', text: this.phone })
        .type(InputType.PhoneNumber)
        .height(40).borderRadius(20)
        .onChange((v: string) => { this.phone = v; })
      if (this.error.length > 0) {
        Text(this.error).fontSize(12).fontColor($r('app.color.alert'))
      }
      Button('提交')
        .width('100%').height(40).borderRadius(20)
        .onClick(() => { if (this.validate()) { /* submit */ } })
    }
    .padding({ left: 16, right: 16, top: 24 })
  }
}
