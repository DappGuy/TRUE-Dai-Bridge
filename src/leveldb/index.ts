import LevelDB = require('level')

const genKey = (...keys: string[]): string => keys.join(':')
const padNumber = (n: number): string => {
  if (n === Infinity) {
    return ':'.padEnd(20, '0')
  }
  return n.toString().padStart(20, '0')
}

interface Datum {
  key: string
  value: any
}

export interface DatumWithTag {
  key: string
  tagName: string
  value: any
  tag: any
}

interface StreamOptions {
  gte: number,
  lte: number,
  reverse?: boolean
  limit?: number
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

  public async indexedWithTag (prefix: string, key: string, index: string, tag: string, value: any): Promise<boolean> {
    let count = await this.getIndexCount(prefix, index)
    count++
    return this.db.batch()
      .put(genKey(prefix, index), count)
      .put(genKey(prefix, index, padNumber(count)), key)
      .put(genKey(prefix, tag, padNumber(count)), true)
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

  public async getAll (
    prefix: string, key: string,
    options: StreamOptions
  ): Promise<Datum[]> {
    return new Promise((resolve: (data: Datum[]) => void) => {
      const rows: Datum[] = []
      const reverse = options.reverse || false
      const limit = options.limit || -1
      this.db.createReadStream({
        lte: genKey(prefix, key, padNumber(options.lte)),
        gte: genKey(prefix, key, padNumber(options.gte)),
        reverse,
        limit
      }).on('data', (datum: Datum) => {
        rows.push(datum)
      }).on('error', () => {
        resolve([])
      }).on('end', () => {
        resolve(rows)
      })
    })
  }

  public async query (prefix: string, index: string, i: number | string): Promise<Datum> {
    let value = null
    if (typeof i === 'number') {
      i = padNumber(i)
    }
    const key = await this.db.get(genKey(prefix, index, i)).catch(() => '')
    if (key) {
      value = await this.get(prefix, key)
    }
    return { key, value }
  }

  public async queryAll (
    prefix: string, index: string,
    options: StreamOptions
  ): Promise<Datum[]> {
    return this.getAll(
      prefix, index, options
    ).then((data: Datum[]) => {
      return Promise.all(data.map(async ({ key }) => {
        return this.get(prefix, key)
          .then(value => {
            return { key, value }
          })
      }))
    })
  }

  public async queryAllByTag (
    prefix: string, index: string, tagName: string,
    options: StreamOptions
  ): Promise<DatumWithTag[]> {
    return this.getAll(
      prefix, tagName, options
    ).then((tags: Datum[]) => {
      return Promise.all(tags.map(async tag => {
        const i = tag.key.split(':').pop() as string
        return this.query(prefix, index, i)
          .then(({ key, value }) => {
            return {
              key,
              value,
              tagName,
              tag: tag.value
            }
          })
      }))
    })
  }

  public async getIndexCount (prefix: string, index: string): Promise<number> {
    const count = (await this.get(prefix, index)) as number || 0
    return count
  }
}
