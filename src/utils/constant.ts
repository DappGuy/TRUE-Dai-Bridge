export const FROM_BLOCK_KEY = 'fromBlock'

export const PROPOSAL_INDEX = 'proposal_1'
export const UN_SIGNED_TAG = 'unSigned'
export const SIGNED_TAG = 'signed'

export const TRANSFER_EVENT = 'Transfer(address,address,uint256)'
export const BURN_EVENT = 'Burn(address,uint256)'

export const HOME_UNLOCK_FUNC_ABI = {
  name: 'unlock',
  inputs: [
    {
      name: 'user',
      type: 'address'
    },
    {
      name: 'value',
      type: 'uint256'
    }
  ]
}
export const FOREIGN_MINT_FUNC_ABI = {
  name: 'mint',
  inputs: [
    {
      name: 'user',
      type: 'address'
    },
    {
      name: 'value',
      type: 'uint256'
    }
  ]
}

export const SUGGEST_ISSUE_FUNC_ABI = {
  name: 'suggestIssue',
  inputs: [
    {
      name: 'proof',
      type: 'bytes32'
    },
    {
      name: 'data',
      type: 'bytes'
    },
    {
      name: 'self',
      type: 'bool'
    }
  ]
}
