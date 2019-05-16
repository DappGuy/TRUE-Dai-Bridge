import * as cors from 'cors'
import * as express from 'express'

import { BaseApp, OptionParam } from '../BaseApp'
import Database from '../leveldb'
import { PROPOSAL_INDEX } from '../utils'

interface ServiceConfig {
  port: number
}

const opts: OptionParam[] = [
  ['-d, --datadir [datadir]', 'Specify a file as levelDB store', '.leveldata']
]

export default class ServiceApp extends BaseApp {

  private db: Database
  private app: express.Express

  private port = 3000

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)
    this.app = express()

    const serviceConfig = this.config.service as ServiceConfig
    this.port = serviceConfig.port

    this.init()
  }

  public start () {
    this.app.listen(this.port)
    this.logger(`[ServiceApp] service start at ${this.port}`)
  }

  private init () {
    this.app.use(cors({
      methods: ['GET'],
      origin: '*'
    }))

    this.app.get('/proposals/:type', async (req, res) => {
      const type = req.params.type
      let prefix = ''
      if (type === 'home2foreign') {
        prefix = 'home'
      } else if (type === 'foreign2home') {
        prefix = 'foreign'
      } else {
        return res.sendStatus(403)
      }
      const offset = Number(req.query.offset) || 0
      const size = Number(req.query.size) || 20
      if (offset < 0 || size < 0) {
        return res.sendStatus(403)
      }
      const proposalCount = await this.db.getIndexCount(prefix, PROPOSAL_INDEX)
      const from = Math.max(0, proposalCount - offset)
      const end = Math.max(0, from - size)
      if (from === end) {
        return res.send({
          rows: [],
          count: proposalCount
        })
      }
      const rows = await this.getProposals(prefix, from, end)
      res.send({
        rows,
        count: proposalCount
      })
    })
  }

  /**
   * return proposals with its index between [from, end)
   */
  private async getProposals (prefix: string, from: number, end: number): Promise<any[]> {
    if (from < end) {
      return []
    }
    const indexs: number[] = []
    for (let i = from; i > end; i--) {
      indexs.push(i)
    }
    return Promise.all(indexs.map(index => {
      return this.db.query(prefix, PROPOSAL_INDEX, index)
    }))
  }
}

const app = new ServiceApp()
app.start()
