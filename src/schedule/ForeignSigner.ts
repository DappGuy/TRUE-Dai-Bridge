import { MsgLogger } from 'src/BaseApp'
import { SignerOptions } from './type'
import Database from 'src/leveldb'

import Signer from './Signer'

export default class ForeignSigner extends Signer {
  constructor (db: Database, logger: MsgLogger, options: SignerOptions) {
    super(db, logger, options)
  }

  get name () { return 'ForeignSigner' }
  get prefix () { return 'home' }
}
