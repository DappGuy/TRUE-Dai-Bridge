import { MsgLogger } from 'src/BaseApp'
import { Log } from 'web3true/types'

import Web3t = require('web3true')

export default class SimpleWeb3t {

  private logger: MsgLogger
  private web3t: Web3t

  constructor (logger: MsgLogger, httpProvider: string, netType?: string) {
    this.logger = logger
    this.web3t = new Web3t(httpProvider, netType)
  }

  get abi () {
    return this.web3t.eth.abi
  }

  get utils () {
    return this.web3t.utils
  }

  get type () {
    return this.web3t.currentProvider.type
  }

  public async getBlockNumber () {
    return this.web3t.eth.getBlockNumber()
      .catch(err => {
        this.logger('Error [Web3t getBlockNumber] ' + err.message || err)
        return 0
      })
  }

  public async getPastLogs (
    fromBlock: number,
    toBlock: number,
    address: string,
    topics: Array<string | null>,
  ) {
    return this.web3t.eth.getPastLogs({
      fromBlock,
      toBlock,
      address,
      topics
    }).catch(err => {
      this.logger('Error [Web3t getPastLogs] ' + err.message || err)
      return [] as Log[]
    })
  }
}
