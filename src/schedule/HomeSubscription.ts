import { Log } from 'web3true/types'
import { MsgLogger } from 'src/BaseApp'
import Database from 'src/leveldb'
import { SubOptions, HomeSubOptions } from './type'

import Subscription from './index'
import { TRANSFER_EVENT, FROM_BLOCK_KEY, PROPOSAL_INDEX, TDAI_ISSUE_FUNC_ABI } from '../utils'

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
    await Promise.all(logs.map(log => {
      const from = this.web3t.abi.decodeParameter('address', log.topics[1])
      const value = this.web3t.abi.decodeParameter('uint256', log.data)
      const hash = log.transactionHash
      const calldata = this.genCalldata(from, value)
      const pid = this.web3t.utils.keccak256(hash + calldata.substr(2) + '00')
      return this.db.indexed(this.prefix, pid, PROPOSAL_INDEX, {
        hash, calldata
      })
    }))

    await this.db.set(this.prefix, FROM_BLOCK_KEY, this.fromHeight)

    return true
  }

  private genCalldata (from: string, value: string): string {
    return this.web3t.abi.encodeFunctionCall(TDAI_ISSUE_FUNC_ABI, [from, value])
  }
}
