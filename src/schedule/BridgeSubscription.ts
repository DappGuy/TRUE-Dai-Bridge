import { Log } from 'web3true/types'
import { MsgLogger } from 'src/BaseApp'
import { SubOptions } from './type'
import Database from 'src/leveldb'
import { FROM_BLOCK_KEY, PROPOSAL_INDEX, UN_SIGNED_TAG } from '../utils'

import Subscription from './Subscription'

export default abstract class BridgeSubscription extends Subscription {

  protected db: Database

  constructor (db: Database, logger: MsgLogger, options: SubOptions) {
    super(logger, options)

    this.db = db
    this.initFromHeightFromDB()
  }

  protected initFromHeightFromDB () {
    this.locked = true
    this.db.get(this.prefix, FROM_BLOCK_KEY).then(height => {
      this.locked = false
      if (typeof height === 'number') {
        this.logger(`[${this.name}] use the block height recorded in leveldb: ${height}`)
        this.fromHeight = height
      }
    })
  }

  protected async processLogs (logs: Log[]): Promise<boolean> {
    await Promise.all(logs.map(log => {
      const user = this.web3t.abi.decodeParameter('address', log.topics[1])
      const value = this.web3t.abi.decodeParameter('uint256', log.data)
      const hash = log.transactionHash
      const block = log.blockNumber
      const calldata = this.genCalldata(user, value)
      const pid = this.web3t.utils.keccak256(hash + calldata.substr(2) + '00')
      this.logger(`[${this.name}] Log: hash`, hash, 'user', user, 'value', (value / 1e18).toFixed(2))
      return this.db.indexedWithTag(this.prefix, pid, PROPOSAL_INDEX, UN_SIGNED_TAG, {
        hash, calldata, block
      })
    }))

    await this.db.set(this.prefix, FROM_BLOCK_KEY, this.fromHeight)

    return true
  }

  protected abstract genCalldata (user: string, value: string): string
}
