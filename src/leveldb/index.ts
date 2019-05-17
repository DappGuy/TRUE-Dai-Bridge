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
  value: any
  tagName: string
  tag: any
  id: string
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
    let id = await this.getIndexCount(prefix, index)
    id++
    return this.db.batch()
      .put(genKey(prefix, index), id)
      .put(genKey(prefix, index, padNumber(id)), key)
      .put(genKey(prefix, key, index), id)
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
    let id = await this.getIndexCount(prefix, index)
    id++
    return this.db.batch()
      .put(genKey(prefix, index), id)
      .put(genKey(prefix, index, padNumber(id)), key)
      .put(genKey(prefix, tag, padNumber(id)), true)
      .put(genKey(prefix, key), value)
      .write()
      .then(() => true)
      .catch(err => {
        // TODO
        console.log(err.message || err)
        return false
      })
  }

  public async updateTag (prefix: string, oriTag: string, newTag: string, id: number | string): Promise<boolean> {
    if (typeof id === 'number') {
      id = padNumber(id)
    }
    const value = await this.db.get(genKey(prefix, oriTag, id)).catch(() => {
      return null
    })
    if (!value) {
      return false
    }
    return this.db.batch()
      .del(genKey(prefix, oriTag, id))
      .put(genKey(prefix, newTag, id), value)
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

  public async query (prefix: string, index: string, id: number | string): Promise<Datum> {
    let value = null
    if (typeof id === 'number') {
      id = padNumber(id)
    }
    const key = await this.db.get(genKey(prefix, index, id)).catch(() => '')
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
    ).then(async (data: Datum[]) => {
      return Promise.all(data.map(async datum => {
        return this.get(prefix, datum.value)
          .then(value => {
            return { key: datum.value, value }
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
    ).then(async (tags: Datum[]) => {
      return Promise.all(tags.map(async tag => {
        const id = tag.key.split(':').pop() as string
        return this.query(prefix, index, id)
          .then(({ key, value }) => {
            return {
              key, value, tagName, id,
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
