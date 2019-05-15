import { BaseApp, OptionParam } from './BaseApp'
import Database from './leveldb'
import HomeSubscription from './schedule/HomeSubscription'

interface HomeNetConfig {
  provider: string
  type: string
  tokenContract: string
  storeContract: string
  fromHeight: number
}

const opts: OptionParam[] = [
  ['-d, --datadir [datadir]', 'Specify a file as levelDB store', '.leveldata']
]

class App extends BaseApp {

  private db: Database
  private homeSub: HomeSubscription

  constructor () {
    super(...opts)

    this.db = new Database(this.command.datadir)

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
  }

  public stop () {
    this.homeSub.stopSubscriptionLogs()
  }
}

const app = new App()
app.start()
