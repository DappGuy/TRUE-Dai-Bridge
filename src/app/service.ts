import { Server } from 'http'
import * as cors from 'cors'
import * as express from 'express'

import { MsgLogger } from '../BaseApp'
import { NetConfig } from './subscribe'
import Database from '../leveldb'

import { PROPOSAL_INDEX, FROM_BLOCK_KEY, UN_SIGNED_TAG } from '../utils'

interface Config {
  service: ServiceConfig
  homeNetwork: NetConfig
  foreignNetwork: NetConfig
}

interface ServiceConfig {
  port: number
}

export default class Service {

  private logger: MsgLogger
  private db: Database
  private app: express.Express

  private homeNetwork: NetConfig
  private foreignNetwork: NetConfig

  private port = 3000
  private server?: Server

  constructor (db: Database, logger: MsgLogger, config: Config) {

    this.logger = logger
    this.db = db
    this.app = express()

    this.port = config.service.port
    this.homeNetwork = config.homeNetwork
    this.foreignNetwork = config.foreignNetwork

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

    this.app.get('/network', async (_, res) => {
      res.json({
        home: {
          provider: this.homeNetwork.provider,
          type: this.homeNetwork.type,
          token: this.homeNetwork.tokenContract,
          multiSign: this.homeNetwork.multiSignContract
        },
        foreign: {
          provider: this.foreignNetwork.provider,
          type: this.foreignNetwork.type,
          token: this.foreignNetwork.tokenContract,
          multiSign: this.foreignNetwork.multiSignContract
        }
      })
    })

    this.app.get('/height/:type', async (req, res) => {
      const type = req.params.type
      let prefix = ''
      if (type === 'home') {
        prefix = 'home'
      } else if (type === 'foreign') {
        prefix = 'foreign'
      } else {
        return res.sendStatus(403)
      }
      const height = await this.db.get(prefix, FROM_BLOCK_KEY)
      res.json(height)
    })

    this.app.get('/proposals/unsigned/:type', async (req, res) => {
      const type = req.params.type
      let prefix = ''
      if (type === 'home2foreign') {
        prefix = 'home'
      } else if (type === 'foreign2home') {
        prefix = 'foreign'
      } else {
        return res.sendStatus(403)
      }
      const rows = await this.getUnsignedProposals(prefix)
      res.send({ rows })
    })

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
    return this.db.queryAll(prefix, PROPOSAL_INDEX, {
      gte: bottom,
      lte: top,
      reverse: true
    })
  }

  private async getUnsignedProposals (prefix: string, ): Promise<any[]> {
    return this.db.queryAllByTag(
      prefix, PROPOSAL_INDEX, UN_SIGNED_TAG, {
        gte: 0,
        lte: Infinity,
        limit: 200
      }
    )
  }
}
