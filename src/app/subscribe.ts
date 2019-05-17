import { BaseApp, OptionParam } from '../BaseApp'
import Database from '../leveldb'
import sWeb3t from '../web3t'
import HomeBridgeSubscription from '../schedule/HomeBridgeSubscription'
import HomeSigner from '../schedule/HomeSigner'
import ForeignBridgeSubscription from '../schedule/ForeignBridgeSubscription'
import ForeignSigner from '../schedule/ForeignSigner'
import Service from './service'

interface NetConfig {
  provider: string
  type: string
  tokenContract: string
  multiSignContract: string
  fromHeight: number,
  gasPrice: number | string
}

const opts: OptionParam[] = [
  ['-d, --datadir [datadir]', 'Specify a file as levelDB store', '.leveldata'],
  ['-s, --service', 'Provide query services']
]

export default class SubscribeApp extends BaseApp {

  private db: Database

  private service?: Service
  private homeSub: HomeBridgeSubscription
  private homeSigner: HomeSigner
  private foreignSub: ForeignBridgeSubscription
  private foreignSigner: ForeignSigner

  private interval: number = 100000

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)

    if (this.command.service) {
      this.service = new Service(this.db, this.logger, this.config.service)
    }

    const adminPrivKey = this.config.adminPrivKey as string

    const homeNetConfig = this.config.homeNetwork as NetConfig
    const homeWeb3t = new sWeb3t(this.logger, homeNetConfig.provider, homeNetConfig.type)
    homeWeb3t.setAccount(adminPrivKey)

    const foreignNetConfig = this.config.foreignNetwork as NetConfig
    const foreignWeb3t = new sWeb3t(this.logger, foreignNetConfig.provider, foreignNetConfig.type)
    foreignWeb3t.setAccount(adminPrivKey)

    this.homeSub = new HomeBridgeSubscription(this.db, this.logger, {
      web3t: homeWeb3t,
      storeContractAddr: homeNetConfig.multiSignContract,
      contractAddr: homeNetConfig.tokenContract,
      fromBlockHeight: homeNetConfig.fromHeight
    })

    this.homeSigner = new HomeSigner(this.db, this.logger, {
      web3t: homeWeb3t,
      multiSignAddr: homeNetConfig.multiSignContract,
      gasPrice: homeNetConfig.gasPrice
    })

    this.foreignSub = new ForeignBridgeSubscription(this.db, this.logger, {
      web3t: foreignWeb3t,
      contractAddr: foreignNetConfig.tokenContract,
      fromBlockHeight: foreignNetConfig.fromHeight
    })

    this.foreignSigner = new ForeignSigner(this.db, this.logger, {
      web3t: foreignWeb3t,
      multiSignAddr: foreignNetConfig.multiSignContract,
      gasPrice: foreignNetConfig.gasPrice
    })

    if (typeof this.config.interval === 'number') {
      this.interval = this.config.interval
    }
  }

  public start () {
    this.homeSub.start(this.interval)

    setTimeout(() => {
      this.homeSigner.start(this.interval)
    }, this.interval * 0.25)

    setTimeout(() => {
      this.foreignSub.start(this.interval)
    }, this.interval * 0.5)

    setTimeout(() => {
      this.foreignSigner.start(this.interval)
    }, this.interval * 0.75)

    if (this.service) {
      this.service.start()
    }
  }

  public stop () {
    this.homeSub.stop()
    this.homeSigner.stop()

    this.foreignSub.stop()
    this.foreignSigner.stop()

    if (this.service) {
      this.service.stop()
    }
  }
}
