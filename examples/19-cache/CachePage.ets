@Entry
@ComponentV2
struct CachePage {
  @Local text: string = '未加载';

  async aboutToAppear() {
    const store = await preferences.getPreferences(this.getUIContext().getHostContext()!, 'cache');
    const cached = await store.get('last', '') as string;
    if (cached.length > 0) {
      this.text = `来自缓存：${cached}`;
      return;
    }
    const req = http.createHttp();
    try {
      const res = await req.request('https://example.com/data', { method: http.RequestMethod.GET, readTimeout: 10000 });
      if (res.responseCode === 200) {
        this.text = String(res.result);
        await store.put('last', this.text);
        await store.flush();
      }
    } finally {
      req.destroy();
    }
  }

  build() {
    Column() { Text(this.text).fontSize(16) }
      .width('100%').height('100%').justifyContent(FlexAlign.Center)
  }
}
