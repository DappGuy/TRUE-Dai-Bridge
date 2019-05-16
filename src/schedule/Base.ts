import { Log } from 'web3true/types'
import { MsgLogger } from 'src/BaseApp'
import { SubOptions } from './type'

import sWeb3t from '../web3t'

export default abstract class Subscription {

  protected web3t: sWeb3t
  protected logger: MsgLogger

  protected fromHeight: number
  protected maxBlockPerStep: number = 100
  protected contractAddr: string
  protected topics: Array<string | null> = []
  protected confirmedInterval: number = 0

  protected locked = false

  private subTimer?: NodeJS.Timeout

  constructor (logger: MsgLogger, options: SubOptions) {
    this.web3t = new sWeb3t(logger, options.httpProvider, options.netType)

    this.logger = logger

    this.contractAddr = options.contractAddr

    this.fromHeight = options.fromBlockHeight || 1

    if (options.netType === 'eth') {
      this.confirmedInterval = 12
    }

    if (options.maxBlockPerStep) {
      this.maxBlockPerStep = options.maxBlockPerStep
    }
  }

  abstract get name (): string
  abstract get prefix (): string

  public setSubTopics (topics: Array<string | null>) {
    this.topics = topics
  }

  public start (interval: number): boolean {
    if (this.subTimer) {
      return false
    }
    this.subTimer = setInterval(() => {
      this.catchLogs()
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

  protected async catchLogs () {
    if (this.locked) {
      return
    }
    this.locked = true

    const topHeight = await this.web3t.getBlockNumber()
    const confirmedHeight = topHeight - this.confirmedInterval
    const toHeight = Math.min(this.fromHeight + this.maxBlockPerStep - 1, confirmedHeight)

    if (toHeight < this.fromHeight) {
      this.locked = false
      return
    }

    this.logger(`[${this.name}] ${Date.now()} catchLogs: ${this.fromHeight} - ${toHeight}`)

    const logs = await this.web3t.getPastLogs(
      this.fromHeight,
      toHeight,
      this.contractAddr,
      this.topics
    )
    this.fromHeight = toHeight + 1

    await this.processLogs(logs)

    this.locked = false
  }

  protected abstract async processLogs (logs: Log[]): Promise<boolean>
}
