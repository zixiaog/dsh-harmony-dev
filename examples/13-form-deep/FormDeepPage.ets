@Entry
@ComponentV2
struct FormDeepPage {
  @Local name: string = '';
  @Local phone: string = '';
  @Local errors: Record<string, string> = {};

  private validate(): boolean {
    const errors: Record<string, string> = {};
    if (this.name.trim().length === 0) errors['name'] = '请输入姓名';
    if (!/^1\d{10}$/.test(this.phone)) errors['phone'] = '手机号格式不正确';
    this.errors = errors;
    return Object.keys(errors).length === 0;
  }

  build() {
    Column({ space: 12 }) {
      TextInput({ placeholder: '姓名', text: this.name })
        .height(40).borderRadius(20)
        .onChange((value: string) => { this.name = value; })
      if (this.errors['name']) Text(this.errors['name']).fontSize(12).fontColor($r('app.color.alert'))
      TextInput({ placeholder: '手机号', text: this.phone })
        .type(InputType.PhoneNumber).height(40).borderRadius(20)
        .onChange((value: string) => { this.phone = value; })
      if (this.errors['phone']) Text(this.errors['phone']).fontSize(12).fontColor($r('app.color.alert'))
      Button('提交').width('100%').height(40).borderRadius(20)
        .onClick(() => { this.validate(); })
    }.padding(16)
  }
}
