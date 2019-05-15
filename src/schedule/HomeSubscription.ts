import { Log } from 'web3true/types'
import { MsgLogger } from 'src/BaseApp'
import Database from 'src/leveldb'
import { SubOptions, HomeSubOptions } from './type'

import Subscription from './index'
import { TRANSFER_EVENT, FROM_BLOCK_KEY } from '../utils'

export default class HomeSubscription extends Subscription {

  private db: Database

  constructor (db: Database, logger: MsgLogger, options: SubOptions & HomeSubOptions) {
    super(logger, options)
    this.db = db

    this.locked = true
    this.db.get(this.prefix, FROM_BLOCK_KEY).then(height => {
      this.locked = false
      if (typeof height === 'number') {
        this.logger(`[${this.name}] use the block height recorded in leveldb: ${height}`)
        this.fromHeight = height
      }
    })

    const topic = this.web3t.abi.encodeEventSignature(TRANSFER_EVENT)
    const store = this.web3t.abi.encodeParameter('address', options.storeContractAddr)
    this.setSubTopics([topic, null, store])
  }

  get name () { return 'HomeSubscription' }
  get prefix () { return 'home' }

  protected async processLogs (logs: Log[]): Promise<boolean> {
    // TODO: record and suggest
    logs.forEach(log => {
      const from = this.web3t.abi.decodeParameter('address', log.topics[1])
      const value = this.web3t.abi.decodeParameter('uint256', log.data)
      console.log('from:', from, 'value:', value)
    })

    this.db.set(this.prefix, FROM_BLOCK_KEY, this.fromHeight)

    return true
  }
}
