@Entry
@ComponentV2
struct NetworkListPage {
  @Local items: string[] = [];
  @Local error: string = '';
  @Local loading: boolean = false;

  private async load(retry: number = 2) {
    this.loading = true;
    this.error = '';
    const req = http.createHttp();
    try {
      const res = await req.request('https://example.com/list', {
        method: http.RequestMethod.GET,
        readTimeout: 10000,
      });
      if (res.responseCode !== 200) throw new Error(`HTTP ${res.responseCode}`);
      this.items = JSON.parse(res.result as string) as string[];
    } catch (e) {
      if (retry > 0) {
        await this.load(retry - 1);
      } else {
        this.error = '加载失败，点击重试';
      }
    } finally {
      req.destroy();
      this.loading = false;
    }
  }

  build() {
    Column() {
      if (this.loading) { LoadingProgress().width(32).height(32) }
      else if (this.error.length > 0) { Text(this.error).onClick(() => this.load()) }
      else {
        List() {
          ForEach(this.items, (item: string) => ListItem() { Text(item) })
        }
      }
    }.width('100%').height('100%')
  }
}
