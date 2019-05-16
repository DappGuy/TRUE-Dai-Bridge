export = level

interface Options {
  valueEncoding?: string
}

declare class BatchChain {
  put (key: string, value: any): BatchChain
  del (key: string): BatchChain
  write (): Promise<any>
}

declare class level {
  constructor (path: string, options?: Options)

  public put (key: string, value: any, options?: any, cb?: Function): Promise<any>
  public get (key: string, options?: any, cb?: Function): Promise<any>
  public del (key: string, options?: any, cb?: Function): Promise<any>
  
  public batch (): BatchChain
}
