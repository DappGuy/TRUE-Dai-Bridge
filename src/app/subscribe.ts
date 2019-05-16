import { BaseApp, OptionParam } from '../BaseApp'
import Database from '../leveldb'
import HomeSubscription from '../schedule/HomeSubscription'
import Service from './service'

interface HomeNetConfig {
  provider: string
  type: string
  tokenContract: string
  storeContract: string
  fromHeight: number
}

const opts: OptionParam[] = [
  ['-d, --datadir [datadir]', 'Specify a file as levelDB store', '.leveldata'],
  ['-s, --service', 'Provide query services']
]

export default class SubscribeApp extends BaseApp {

  private db: Database

  private service?: Service
  private homeSub: HomeSubscription

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)

    if (this.command.service) {
      this.service = new Service(this.db, this.logger, this.config.service)
    }

    const homeNetConfig = this.config.homeNetwork as HomeNetConfig

    this.homeSub = new HomeSubscription(this.db, this.logger, {
      httpProvider: homeNetConfig.provider,
      netType: homeNetConfig.type,
      storeContractAddr: homeNetConfig.storeContract,
      contractAddr: homeNetConfig.tokenContract,
      fromBlockHeight: homeNetConfig.fromHeight
    })
  }

  public start () {
    this.homeSub.startSubscriptionLogs(5000)
    if (this.service) {
      this.service.start()
    }
  }

  public stop () {
    this.homeSub.stopSubscriptionLogs()
    if (this.service) {
      this.service.stop()
    }
  }
}
