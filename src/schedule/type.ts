export interface SubOptions {
  httpProvider: string,
  netType?: string,
  contractAddr: string
  fromBlockHeight?: number
  maxBlockPerStep?: number
}

export interface HomeSubOptions {
  storeContractAddr: string
}
