import { Server } from 'http'
import * as cors from 'cors'
import * as express from 'express'

import { MsgLogger } from '../BaseApp'
import Database from '../leveldb'

import { PROPOSAL_INDEX } from '../utils'

interface ServiceConfig {
  port: number
}

export default class Service {

  private logger: MsgLogger
  private db: Database
  private app: express.Express

  private port = 3000
  private server?: Server

  constructor (db: Database, logger: MsgLogger, config: ServiceConfig) {

    this.logger = logger
    this.db = db
    this.app = express()

    this.port = config.port

    this.init()
  }

  public start () {
    this.server = this.app.listen(this.port)
    this.logger(`[ServiceApp] service start at ${this.port}`)
  }

  public stop () {
    if (this.server) {
      this.server.close()
    }
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
      if (offset < 0 || size <= 0) {
        return res.sendStatus(403)
      }
      const proposalCount = await this.db.getIndexCount(prefix, PROPOSAL_INDEX)
      const top = Math.max(0, proposalCount - offset)
      if (top === 0) {
        return res.send({
          rows: [],
          count: proposalCount
        })
      }
      const bottom = Math.max(0, top - size + 1)
      const rows = await this.getProposals(prefix, top, bottom)
      res.send({
        rows,
        count: proposalCount
      })
    })
  }

  /**
   * return proposals with its index between [top, bottom]
   */
  private async getProposals (prefix: string, top: number, bottom: number): Promise<any[]> {
    if (top < bottom) {
      return []
    }
    return this.db.queryAll(prefix, PROPOSAL_INDEX, bottom, top, true)
  }
}
