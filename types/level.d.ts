export = level

interface Options {
  valueEncoding?: string
}

declare class level {
  constructor (path: string, options?: Options)

  public put (key: string, value: any, options?: any, cb?: Function): Promise<any>
  public get (key: string, options?: any, cb?: Function): Promise<any>
  public del (key: string, options?: any, cb?: Function): Promise<any>
}
