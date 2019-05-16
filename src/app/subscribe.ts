import { BaseApp, OptionParam } from '../BaseApp'
import Database from '../leveldb'
import HomeBridgeSubscription from '../schedule/HomeBridgeSubscription'
import ForeignBridgeSubscription from '../schedule/ForeignBridgeSubscription'
import Service from './service'

interface NetConfig {
  provider: string
  type: string
  tokenContract: string
  multiSignContract: string
  fromHeight: number
}

const opts: OptionParam[] = [
  ['-d, --datadir [datadir]', 'Specify a file as levelDB store', '.leveldata'],
  ['-s, --service', 'Provide query services']
]

export default class SubscribeApp extends BaseApp {

  private db: Database

  private service?: Service
  private homeSub: HomeBridgeSubscription
  private foreignSub: ForeignBridgeSubscription

  private interval: number = 100000

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)

    if (this.command.service) {
      this.service = new Service(this.db, this.logger, this.config.service)
    }

    const homeNetConfig = this.config.homeNetwork as NetConfig
    this.homeSub = new HomeBridgeSubscription(this.db, this.logger, {
      httpProvider: homeNetConfig.provider,
      netType: homeNetConfig.type,
      storeContractAddr: homeNetConfig.multiSignContract,
      contractAddr: homeNetConfig.tokenContract,
      fromBlockHeight: homeNetConfig.fromHeight
    })

    const foreignNetConfig = this.config.foreignNetwork as NetConfig
    this.foreignSub = new ForeignBridgeSubscription(this.db, this.logger, {
      httpProvider: foreignNetConfig.provider,
      netType: foreignNetConfig.type,
      contractAddr: foreignNetConfig.tokenContract,
      fromBlockHeight: foreignNetConfig.fromHeight
    })

    if (typeof this.config.interval === 'number') {
      this.interval = this.config.interval
    }
  }

  public start () {
    this.homeSub.start(this.interval)
    setTimeout(() => {
      this.foreignSub.start(this.interval)
    }, this.interval / 2)
    if (this.service) {
      this.service.start()
    }
  }

  public stop () {
    this.homeSub.stop()
    this.foreignSub.stop()
    if (this.service) {
      this.service.stop()
    }
  }
}
