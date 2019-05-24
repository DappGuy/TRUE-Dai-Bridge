import { BaseApp, OptionParam } from '../BaseApp'
import Database from '../leveldb'
import sWeb3t from '../web3t'
import HomeBridgeSubscription from '../schedule/HomeBridgeSubscription'
import HomeSigner from '../schedule/HomeSigner'
import ForeignBridgeSubscription from '../schedule/ForeignBridgeSubscription'
import ForeignSigner from '../schedule/ForeignSigner'
import Service from './service'

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
  ['-s, --service', 'Provide query services'],
  ['--ignorehomechain', 'Do not participate in home to foreign network voting'],
  ['--ignoreforeignchain', 'Do not participate in foreign to home network voting']
]

export default class SubscribeApp extends BaseApp {

  private db: Database

  private service?: Service
  private homeSub: HomeBridgeSubscription
  private homeSigner: HomeSigner
  private foreignSub: ForeignBridgeSubscription
  private foreignSigner: ForeignSigner

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)

    if (this.command.service) {
      this.service = new Service(this.db, this.logger, this.config)
    }

    const adminPrivKey = this.config.adminPrivKey as string

    const homeNetConfig = this.config.homeNetwork as NetConfig
    const homeWeb3t = new sWeb3t(this.logger, homeNetConfig.provider, homeNetConfig.type)
    homeWeb3t.setAccount(adminPrivKey)

    const foreignNetConfig = this.config.foreignNetwork as NetConfig
    const foreignWeb3t = new sWeb3t(this.logger, foreignNetConfig.provider, foreignNetConfig.type)
    foreignWeb3t.setAccount(adminPrivKey)

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
