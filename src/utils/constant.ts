export const FROM_BLOCK_KEY = 'fromBlock'

export const PROPOSAL_INDEX = 'proposal_1'
export const UN_SIGNED_TAG = 'unSigned'

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
export const FOREIGN_ISSUE_FUNC_ABI = {
  name: 'issue',
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
