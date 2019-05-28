import { existsSync, readFileSync } from 'fs'
import * as prompts from 'prompts'

import { BaseApp, OptionParam } from '../BaseApp'
import Database from '../leveldb'
import sWeb3t from '../web3t'
import HomeBridgeSubscription from '../schedule/HomeBridgeSubscription'
import HomeSigner from '../schedule/HomeSigner'
import ForeignBridgeSubscription from '../schedule/ForeignBridgeSubscription'
import ForeignSigner from '../schedule/ForeignSigner'
import Service from './service'

import { Account, PrivateKey } from 'web3true/eth/accounts'

export interface NetConfig {
  provider: string
  type: string
  tokenContract: string
  multiSignContract: string
  fromHeight: number,
  gasPrice: number | string
}

const opts: OptionParam[] = [
  ['-d, --datadir [datadir]', 'Specify a file as levelDB store', '.leveldata'],
  ['-k, --keystore [keystore]', 'Import accounts by using keystore'],
  ['-s, --service', 'Provide query services'],
  ['--ignorehomechain', 'Do not participate in home to foreign network voting'],
  ['--ignoreforeignchain', 'Do not participate in foreign to home network voting']
]

export default class SubscribeApp extends BaseApp {

  private db: Database

  private service?: Service
  private homeSub?: HomeBridgeSubscription
  private homeSigner?: HomeSigner
  private foreignSub?: ForeignBridgeSubscription
  private foreignSigner?: ForeignSigner

  private keystore?: PrivateKey
  private account?: Account

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)
  }

  public async init () {
    const homeNetConfig = this.config.homeNetwork as NetConfig
    const homeWeb3t = new sWeb3t(this.logger, homeNetConfig.provider, homeNetConfig.type)
    const foreignNetConfig = this.config.foreignNetwork as NetConfig
    const foreignWeb3t = new sWeb3t(this.logger, foreignNetConfig.provider, foreignNetConfig.type)

    if (this.command.keystore) {
      const keyFile = this.command.keystore
      if (!existsSync(keyFile)) {
        this.logger(`[App] ketstore file ${keyFile} not found`)
        process.exit(1)
      }
      try {
        this.keystore = JSON.parse(readFileSync(keyFile, { encoding: 'utf8' }))
      } catch (e) {
        this.logger(`[App] syntax error in ketstore file ${keyFile}`)
        this.logger(e)
        process.exit(1)
      }

      const response = await prompts({
        type: 'password',
        name: 'pwd',
        message: 'Enter the password of keystore',
        validate: (value: string) => {
          const account = homeWeb3t.unlockAccount(this.keystore!, value)
          if (account) {
            this.account = account
            return true
          } else {
            return 'Password error'
          }
        }
      })
      if (!response.pwd || !this.account) {
        return process.exit(1)
      } else {
        console.log('[App] correct password, service startup')
      }
    } else {
      const adminPrivKey = this.config.adminPrivKey as string
      const account = homeWeb3t.privateKeyToAccount(adminPrivKey)
      if (!account) {
        this.logger('[App] private key error')
        return process.exit(1)
      }
      this.account = account
    }

    this.logger('[App] use admin account:', this.account.address)
    this.db.set('app', 'admin', this.account.address)

    if (this.command.service) {
      this.service = new Service(this.db, this.logger, this.config)
    }

    homeWeb3t.setAccount(this.account)
    foreignWeb3t.setAccount(this.account)

    // home 2 foreign -----------------------------------------------
    this.homeSub = new HomeBridgeSubscription(this.db, this.logger, {
      web3t: homeWeb3t,
      storeContractAddr: homeNetConfig.multiSignContract,
      contractAddr: homeNetConfig.tokenContract,
      fromBlockHeight: homeNetConfig.fromHeight
    })

    this.foreignSigner = new ForeignSigner(this.db, this.logger, {
      web3t: foreignWeb3t,
      multiSignAddr: foreignNetConfig.multiSignContract,
      gasPrice: foreignNetConfig.gasPrice
    })
    // --------------------------------------------------------------

    // foreign 2 home -----------------------------------------------------
    this.foreignSub = new ForeignBridgeSubscription(this.db, this.logger, {
      web3t: foreignWeb3t,
      contractAddr: foreignNetConfig.tokenContract,
      fromBlockHeight: foreignNetConfig.fromHeight
    })

    this.homeSigner = new HomeSigner(this.db, this.logger, {
      web3t: homeWeb3t,
      multiSignAddr: homeNetConfig.multiSignContract,
      gasPrice: homeNetConfig.gasPrice
    })
    // --------------------------------------------------------------------
  }

  public start () {
    if (!this.homeSub || ! this.foreignSigner || !this.foreignSub || ! this.homeSigner) {
      return
    }
    if (!this.command.ignorehomechain) {
      this.homeSub.start(0, 4)
      this.foreignSigner.start(3, 4)
    }

    if (!this.command.ignoreforeignchain) {
      this.foreignSub.start(2, 4)
      this.homeSigner.start(1, 4)
    }

    if (this.service) {
      this.service.start()
    }
  }

  public stop () {
    if (!this.homeSub || ! this.foreignSigner || !this.foreignSub || ! this.homeSigner) {
      return
    }
    if (!this.command.ignorehomechain) {
      this.homeSub.stop()
      this.foreignSigner.stop()
    }

    if (!this.command.ignoreforeignchain) {
      this.foreignSub.stop()
      this.homeSigner.stop()
    }

    if (this.service) {
      this.service.stop()
    }
  }
}
