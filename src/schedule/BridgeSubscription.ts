import { Log } from 'web3true/types'
import { MsgLogger } from 'src/BaseApp'
import { SubOptions } from './type'
import Database from 'src/leveldb'

import Subscription from './Base'
import { FROM_BLOCK_KEY, PROPOSAL_INDEX, UN_SIGNED_TAG } from '../utils'

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
      const from = this.web3t.abi.decodeParameter('address', log.topics[1])
      const value = this.web3t.abi.decodeParameter('uint256', log.data)
      const hash = log.transactionHash
      const block = log.blockNumber
      const calldata = this.genCalldata(from, value)
      const pid = this.web3t.utils.keccak256(hash + calldata.substr(2) + '00')
      return this.db.indexedWithTag(this.prefix, pid, PROPOSAL_INDEX, UN_SIGNED_TAG, {
        hash, calldata, block
      })
    }))

    await this.db.set(this.prefix, FROM_BLOCK_KEY, this.fromHeight)

    return true
  }

  protected abstract genCalldata (from: string, value: string): string
}
