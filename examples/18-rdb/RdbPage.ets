@Entry
@ComponentV2
struct RdbPage {
  @Local items: string[] = [];
  private store: relationalStore.RdbStore | null = null;

  async aboutToAppear() {
    this.store = await relationalStore.getRdbStore(this.getUIContext().getHostContext()!, {
      name: 'demo.db',
      securityLevel: relationalStore.SecurityLevel.S1,
    });
    await this.store.executeSql('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, title TEXT)');
    await this.load();
  }

  private async load() {
    const rs = await this.store!.querySql('SELECT title FROM t');
    const list: string[] = [];
    while (rs.goToNextRow()) list.push(rs.getString(rs.getColumnIndex('title')));
    rs.close();
    this.items = list;
  }

  build() {
    Column({ space: 12 }) {
      Button('新增一条').onClick(async () => {
        await this.store!.executeSql('INSERT INTO t (title) VALUES (?)', [`条目${this.items.length + 1}`]);
        await this.load();
      })
      List() {
        ForEach(this.items, (item: string) => ListItem() { Text(item).height(56) }, (item: string) => item)
      }
    }.padding(16)
  }
}
