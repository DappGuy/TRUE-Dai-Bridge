import LevelDB = require('level')

export default class Database {
  private db: LevelDB
  constructor (path: string) {
    this.db = new LevelDB(path, {
      valueEncoding: 'json'
    })
  }

  public async set (prefix: string, key: string, value: any) {
    return this.db.put(`${prefix}:${key}`, value).catch(err => {
      // TODO
      console.log(err.message || err)
    })
  }

  public async get (prefix: string, key: string) {
    return this.db.get(`${prefix}:${key}`).catch(() => {
      return undefined
    })
  }
}
