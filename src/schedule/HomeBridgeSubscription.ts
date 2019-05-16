import { MsgLogger } from 'src/BaseApp'
import Database from 'src/leveldb'
import { SubOptions, HomeSubOptions } from './type'

import BridgeSubscription from './BridgeSubscription'
import { TRANSFER_EVENT, FOREIGN_ISSUE_FUNC_ABI } from '../utils'

export default class HomeBridgeSubscription extends BridgeSubscription {
  constructor (db: Database, logger: MsgLogger, options: SubOptions & HomeSubOptions) {
    super(db, logger, options)

    const topic = this.web3t.abi.encodeEventSignature(TRANSFER_EVENT)
    const store = this.web3t.abi.encodeParameter('address', options.storeContractAddr)
    this.setSubTopics([topic, null, store])
  }

  get name () { return 'HomeBridgeSubscription' }
  get prefix () { return 'home' }

  protected genCalldata (user: string, value: string): string {
    return this.web3t.abi.encodeFunctionCall(FOREIGN_ISSUE_FUNC_ABI, [user, value])
  }
}
