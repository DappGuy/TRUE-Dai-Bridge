import { Log } from 'web3true/types'
import { MsgLogger } from 'src/BaseApp'
import { SubOptions } from './type'

import { CronJob, CronTime } from 'cron'
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
  private lockState = 0

  private job: CronJob

  constructor (logger: MsgLogger, options: SubOptions) {
    if (options.web3t) {
      this.web3t = options.web3t
      if (options.web3t.type === 'eth') {
        this.confirmedInterval = 12
      }
    } else if (options.httpProvider) {
      this.web3t = new sWeb3t(logger, options.httpProvider, options.netType)
      if (options.netType === 'eth') {
        this.confirmedInterval = 12
      }
    } else {
      throw new Error('Error [Subscription] unable to initialize web3t')
    }

    this.logger = logger

    this.contractAddr = options.contractAddr

    this.fromHeight = options.fromBlockHeight || 1

    if (options.maxBlockPerStep) {
      this.maxBlockPerStep = options.maxBlockPerStep
    }

    this.job = new CronJob('*/4 * * * * *', () => {
      this.catchLogs()
    }, () => {
      this.logger(`[${this.name}] complete`)
    })
  }

  abstract get name (): string
  abstract get prefix (): string

  public setSubTopics (topics: Array<string | null>) {
    this.topics = topics
  }

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

  protected async catchLogs () {
    if (this.locked) {
      this.logger(`[${this.name}] ${Date.now()} locked`, 'lockState:', this.lockState)
      return
    }
    this.locked = true
    this.lockState = 1

    const topHeight = await this.web3t.getBlockNumber()
    this.lockState = 2
    const confirmedHeight = topHeight - this.confirmedInterval
    const toHeight = Math.min(this.fromHeight + this.maxBlockPerStep - 1, confirmedHeight)

    this.lockState = 3
    if (toHeight < this.fromHeight) {
      this.locked = false
      return
    }
    this.lockState = 4
    this.logger(`[${this.name}] ${Date.now()} catchLogs: ${this.fromHeight} - ${toHeight}`)

    const logs = await this.web3t.getPastLogs(
      this.fromHeight,
      toHeight,
      this.contractAddr,
      this.topics
    )
    this.lockState = 5
    if (!logs || typeof logs === 'boolean') {
      this.locked = false
      return
    }
    this.lockState = 6
    this.fromHeight = toHeight + 1

    await this.processLogs(logs)
    this.lockState = 0
    this.locked = false
  }

  protected abstract async processLogs (logs: Log[]): Promise<boolean>
}
