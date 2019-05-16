import LevelDB = require('level')

const genKey = (...keys: string[]): string => keys.join(':')
const padNumber = (n: number): string => n.toString().padStart(20, '0')

interface Datum {
  key: string
  value: any
}

export default class Database {
  private db: LevelDB
  constructor (path: string) {
    this.db = new LevelDB(path, {
      valueEncoding: 'json'
    })
  }

  public async set (prefix: string, key: string, value: any): Promise<boolean> {
    return this.db.put(genKey(prefix, key), value)
      .then(() => true)
      .catch(err => {
        // TODO
        console.log(err.message || err)
        return false
      })
  }

  public async indexed (prefix: string, key: string, index: string, value: any): Promise<boolean> {
    let count = await this.getIndexCount(prefix, index)
    count++
    return this.db.batch()
      .put(genKey(prefix, index), count)
      .put(genKey(prefix, index, padNumber(count)), key)
      .put(genKey(prefix, key), value)
      .write()
      .then(() => true)
      .catch(err => {
        // TODO
        console.log(err.message || err)
        return false
      })
  }

  public async get (prefix: string, key: string): Promise<any> {
    return this.db.get(genKey(prefix, key)).catch(() => {
      return null
    })
  }

  public async query (prefix: string, index: string, i: number): Promise<Datum> {
    let value = null
    const key = await this.db.get(genKey(prefix, index, padNumber(i))).catch(() => '')
    if (key) {
      value = await this.get(prefix, key)
    }
    return { key, value }
  }

  public async queryAll (
    prefix: string, index: string,
    gte: number, lte: number,
    reverse: boolean = false
  ): Promise<Datum[]> {
    return new Promise((resolve: (keys: string[]) => void) => {
      const rows: string[] = []
      this.db.createValueStream({
        lte: genKey(prefix, index, padNumber(lte)),
        gte: genKey(prefix, index, padNumber(gte)),
        reverse
      }).on('data', (value: string) => {
        rows.push(value)
      }).on('error', () => {
        resolve([])
      }).on('end', () => {
        resolve(rows)
      })
    }).then((keys: string[]) => {
      return Promise.all(keys.map(async key => {
        return this.get(prefix, key)
          .then(value => {
            return { key, value }
          })
      }))
    })
  }

  public async getIndexCount (prefix: string, index: string): Promise<number> {
    const count = (await this.get(prefix, index)) as number || 0
    return count
  }
}
