import * as cmd from 'commander'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import * as process from 'process'
import { logFile } from './utils'

export type OptionParam = [
  string, string, any?
]

export type MsgLogger = (message?: any, ...optionalParams: any[]) => void

const defaultOpts: OptionParam[] = [
  ['-c, --config [config]', 'Specify a file as configure', 'config.json'],
  ['-l, --log [log]', 'Specify log file']
]

export abstract class BaseApp {
  public logger: MsgLogger = console.log
  public configFile: string = ''
  public config: any = {}
  public command: cmd.Command
  constructor (...opts: OptionParam[]) {
    const VERSION = process.env.npm_package_version || '0.0.0'

    this.command = cmd.version(VERSION)
    defaultOpts.forEach(opt => {
      this.command = this.command.option(...opt)
    })
    opts.forEach(opt => {
      this.command = this.command.option(...opt)
    })
    this.command.parse(process.argv)

    this.logger = this.command.log ?
      logFile(resolve(this.command.log)) :
      console.log

    this.configFile = resolve(this.command.config)

    this.loadConfig()
  }
  protected loadConfig () {
    if (!existsSync(this.configFile)) {
      this.logger(`config file ${this.configFile} not found`)
      process.exit(1)
    }
    try {
      this.config = JSON.parse(readFileSync(this.configFile, { encoding: 'utf8' }))
    } catch (e) {
      this.logger(`syntax error in config file ${this.configFile}`)
      this.logger(e)
      process.exit(1)
    }
  }
  protected exit (code: number) {
    process.exit(code)
  }
}
