import { MsgLogger } from 'src/BaseApp'
import { SignerOptions } from './type'
import Database, { DatumWithTag } from 'src/leveldb'
import { PROPOSAL_INDEX, UN_SIGNED_TAG, SIGNED_TAG, SUGGEST_ISSUE_FUNC_ABI } from '../utils'

import { CronJob, CronTime } from 'cron'
import sWeb3t from '../web3t'

export default abstract class Signer {

  protected db: Database
  protected web3t: sWeb3t
  protected logger: MsgLogger

  protected multiSignAddr: string
  protected gasPrice: number | string

  protected locked = false

  private job: CronJob

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

    this.job = new CronJob('*/4 * * * * *', () => {
      this.catchProposals()
    }, () => {
      this.logger(`[${this.name}] complete`)
    })
  }

  abstract get name (): string
  abstract get prefix (): string

  public start (offset: number, interval: number): boolean {
    const second = []
    for (let i = offset; i < 60; i += interval) {
      second.push(i)
    }
    const cornTime = second.join(',') + ' * * * * *'
    this.job.setTime(new CronTime(cornTime))
    this.job.start()
    return true
  }

  public stop (): boolean {
    this.job.stop()
    return true
  }

  protected async catchProposals () {
    if (this.locked) {
      this.logger(`[${this.name}] ${Date.now()} locked`)
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
        this.logger(`[${this.name}] signed: hash`, p.key)
        await this.db.updateTag(this.prefix, UN_SIGNED_TAG, SIGNED_TAG, p.id)
      } else {
        const exist = await this.web3t.checkTransaction(txHash)
        if (!exist) {
          this.db.set(this.prefix, [UN_SIGNED_TAG, p.id].join(':'), true)
        }
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
        gas: 3000000,
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
