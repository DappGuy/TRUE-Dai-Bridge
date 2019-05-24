import { MsgLogger } from 'src/BaseApp'
import { Log } from 'web3true/types'
import { Tx } from 'web3true/eth/types'

import Web3t = require('web3true')

export default class SimpleWeb3t {

  private logger: MsgLogger
  private web3t: Web3t

  private address?: string

  constructor (logger: MsgLogger, httpProvider: string, netType?: string) {
    this.logger = logger
    this.web3t = new Web3t(httpProvider, netType)
    this.web3t.eth.defaultBlock = 'pending'
  }

  public setAccount (privateKey: string) {
    const account = this.web3t.eth.accounts.privateKeyToAccount(privateKey)
    this.address = account.address
    this.web3t.eth.accounts.wallet.add(account)
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

  public async getBlockNumber (): Promise<number> {
    return this.web3t.eth.getBlockNumber()
      .catch(err => {
        this.logger('Error [Web3t getBlockNumber] ' + err.message || err)
        return 0
      })
  }

  public async checkTransactionReceipt (txHash: string): Promise<boolean> {
    return this.web3t.eth.getTransactionReceipt(txHash)
      .then(receipt => !!receipt)
      .catch(err => {
        this.logger('Error [Web3t getTransactionReceipt] ' + err.message || err)
        return false
      })
  }

  public async getPastLogs (
    fromBlock: number,
    toBlock: number,
    address: string,
    topics: Array<string | null>,
  ): Promise<Log[] | boolean> {
    return this.web3t.eth.getPastLogs({
      fromBlock,
      toBlock,
      address,
      topics
    }).catch(err => {
      this.logger('Error [Web3t getPastLogs] ' + err.message || err)
      return false
    })
  }

  public async sendTransactionByAdmin (tx: Tx): Promise<string> {
    if (!this.address) {
      return ''
    }
    return new Promise((resolve: (hash: string) => void) => {
      this.web3t.eth.sendTransaction(Object.assign({
        from: this.address
      }, tx), (err, txHash) => {
        if (err) {
          this.logger('Error [Web3t sendTransaction] ' + err.message || err)
          resolve('')
        } else {
          resolve(txHash)
        }
      })
    })
  }
}
