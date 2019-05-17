import { MsgLogger } from 'src/BaseApp'
import { SignerOptions } from './type'
import Database, { DatumWithTag } from 'src/leveldb'
import { PROPOSAL_INDEX, UN_SIGNED_TAG, SIGNED_TAG, SUGGEST_ISSUE_FUNC_ABI } from '../utils'

import sWeb3t from '../web3t'

export default abstract class Signer {

  protected db: Database
  protected web3t: sWeb3t
  protected logger: MsgLogger

  protected multiSignAddr: string
  protected gasPrice: number | string

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
    this.gasPrice = options.gasPrice
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

    const pendingProposals: DatumWithTag[] = []
    const unSignedProposals: DatumWithTag[] = []

    unFinishedProposals.forEach(p => {
      if (/^0x[\da-fA-F]{64}$/.test(p.tag)) {
        pendingProposals.push(p)
      } else {
        unSignedProposals.push(p)
      }
    })

    await this.catchReceipt(pendingProposals)
    await this.signProposals(unSignedProposals)

    this.locked = false
  }

  protected async catchReceipt (proposals: DatumWithTag[]): Promise<boolean> {
    await Promise.all(proposals.map(async p => {
      const txHash = p.tag
      const finished = await this.web3t.checkTransactionReceipt(txHash)
      if (finished) {
        await this.db.updateTag(this.prefix, UN_SIGNED_TAG, SIGNED_TAG, p.id)
      }
    }))
    return true
  }

  protected async signProposals (proposals: DatumWithTag[]): Promise<boolean> {
    for (const p of proposals) {
      const calldata = p.value.calldata
      const hash = p.value.hash
      let data = ''
      try {
        data = this.web3t.abi.encodeFunctionCall(SUGGEST_ISSUE_FUNC_ABI, [
          hash, calldata, false
        ])
      } catch (err) {
        this.logger('Error [Signer signProposals] ' + err.message || err)
      }
      if (!data) {
        continue
      }
      const txHash = await this.web3t.sendTransactionByAdmin({
        to: this.multiSignAddr,
        data,
        gas: 1000000,
        gasPrice: this.gasPrice
      })
      if (!txHash) {
        continue
      }
      await this.db.set(this.prefix, [p.tagName, p.id].join(':'), txHash)
    }
    return true
  }
}
