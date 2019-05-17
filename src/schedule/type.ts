import SimpleWeb3t from 'src/web3t'

export interface SubOptions {
  web3t?: SimpleWeb3t
  httpProvider?: string,
  netType?: string,
  contractAddr: string
  fromBlockHeight?: number
  maxBlockPerStep?: number
}

export interface HomeSubOptions {
  storeContractAddr: string
}

export interface SignerOptions {
  web3t?: SimpleWeb3t
  httpProvider?: string,
  netType?: string,
  multiSignAddr: string
}
