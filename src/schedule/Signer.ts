import { MsgLogger } from 'src/BaseApp'
import { SignerOptions } from './type'
import Database, { DatumWithTag } from 'src/leveldb'
import { PROPOSAL_INDEX, UN_SIGNED_TAG } from '../utils'

import sWeb3t from '../web3t'

export default abstract class Signer {

  protected db: Database
  protected web3t: sWeb3t
  protected logger: MsgLogger

  protected multiSignAddr: string
  protected topics: Array<string | null> = []

  protected locked = false

  private subTimer?: NodeJS.Timeout

  constructor (db: Database, logger: MsgLogger, options: SignerOptions) {

    this.db = db

    if (options.web3t) {
      this.web3t = options.web3t
    } else if (options.httpProvider) {
      this.web3t = new sWeb3t(logger, options.httpProvider, options.netType)
    } else {
      throw new Error('Error [Signer] unable to initialize web3t')
    }

    this.logger = logger

    this.multiSignAddr = options.multiSignAddr
  }

  abstract get name (): string
  abstract get prefix (): string

  public start (interval: number): boolean {
    if (this.subTimer) {
      return false
    }
    this.subTimer = setInterval(() => {
      this.catchProposals()
    }, interval)
    return true
  }

  public stop (): boolean {
    if (!this.subTimer) {
      return false
    }
    clearTimeout(this.subTimer)
    return true
  }

  protected async catchProposals () {
    if (this.locked) {
      return
    }
    this.locked = true

    const unFinishedProposals = await this.db.queryAllByTag(
      this.prefix, PROPOSAL_INDEX, UN_SIGNED_TAG, {
        gte: 0,
        lte: Infinity,
        limit: 30
      }
    )

    const pendingProposals = []
    const unSignedProposals = []

    unFinishedProposals.forEach(p => {
      if (/^0x[\da-fA-F]{64}$/.test(p.value)) {
        pendingProposals.push(p)
      } else {
        unSignedProposals.push(p)
      }
    })

    await this.processProposals(unFinishedProposals)

    this.locked = false
  }

  protected abstract async processProposals (proposals: DatumWithTag[]): Promise<boolean>
}
