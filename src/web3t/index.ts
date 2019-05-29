import { MsgLogger } from 'src/BaseApp'
import { Log } from 'web3true/types'
import { Tx } from 'web3true/eth/types'

import Web3t = require('web3true')
import { Account, PrivateKey } from 'web3true/eth/accounts'

export default class SimpleWeb3t {

  private logger: MsgLogger
  private web3t: Web3t

  private address?: string
  private nonce?: number

  constructor (logger: MsgLogger, httpProvider: string, netType?: string) {
    this.logger = logger
    this.web3t = new Web3t(httpProvider, netType)
    this.web3t.eth.defaultBlock = 'pending'
  }

  public setAccount (account: Account) {
    this.address = account.address
    this.web3t.eth.accounts.wallet.add(account)
    this.web3t.eth.getTransactionCount(account.address)
      .then(nonce => {
        this.nonce = nonce
      })
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

  public unlockAccount (keystore: PrivateKey, pwd: string): Account | false {
    try {
      const account = this.web3t.eth.accounts.decrypt(keystore, pwd)
      return account
    } catch (_) {
      return false
    }
  }

  public privateKeyToAccount (privKey: string): Account | false {
    try {
      const account = this.web3t.eth.accounts.privateKeyToAccount(privKey)
      return account
    } catch (_) {
      return false
    }
  }

  public async getBlockNumber (): Promise<number> {
    return this.web3t.eth.getBlockNumber()
      .catch(err => {
        this.logger('Error [Web3t getBlockNumber] ' + err.message || err)
        return 0
      })
  }

  public async checkTransaction (txHash: string): Promise<boolean> {
    return this.web3t.eth.getTransaction(txHash)
      .then(tx => !!tx)
      .catch(err => {
        this.logger('Error [Web3t getTransaction] ' + err.message || err)
        return false
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
    const nonce = await this.updateNonce()
    return new Promise((resolve: (hash: string) => void) => {
      this.web3t.eth.sendTransaction(Object.assign({
        from: this.address,
        nonce
      }, tx), (err, txHash) => {
        if (err) {
          this.logger('Error [Web3t sendTransaction] ' + err.message || err)
          resolve('')
        } else {
          this.nonce = nonce
          resolve(txHash)
        }
      })
    })
  }

  private async updateNonce (): Promise<number> {
    const nonce = await this.web3t.eth.getTransactionCount(this.address!)
    return Math.max(this.nonce || -1 + 1, nonce)
  }
}
