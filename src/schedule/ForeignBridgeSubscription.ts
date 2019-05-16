import { MsgLogger } from 'src/BaseApp'
import Database from 'src/leveldb'
import { SubOptions } from './type'

import BridgeSubscription from './BridgeSubscription'
import { BURN_EVENT, HOME_UNLOCK_FUNC_ABI } from '../utils'

export default class ForeignBridgeSubscription extends BridgeSubscription {
  constructor (db: Database, logger: MsgLogger, options: SubOptions) {
    super(db, logger, options)

    const topic = this.web3t.abi.encodeEventSignature(BURN_EVENT)
    this.setSubTopics([topic])
  }

  get name () { return 'ForeignBridgeSubscription' }
  get prefix () { return 'foreign' }

  protected genCalldata (user: string, value: string): string {
    return this.web3t.abi.encodeFunctionCall(HOME_UNLOCK_FUNC_ABI, [user, value])
  }
}
