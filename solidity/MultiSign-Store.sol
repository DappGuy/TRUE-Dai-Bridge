pragma solidity ^0.5.0;

import "./MultiSign.sol";

interface ERC20 {
  function transfer (address, uint256) external;
}

contract MultiSignStore is MultiSign {
  ERC20 public token;

  mapping (address => uint256) internal balance;
  uint256 public fee = 0.12 ether;

  event Unlock (address indexed user, uint256 amount, uint256 fee);
  event UpdateFee (uint256 fee);

  constructor (ERC20 _token, uint256 _threshold, address[] memory _whiteList) MultiSign (address(this), _threshold, _whiteList) public {
    require(address(_token).isContract(), "target must be a contract");
    token = _token;
  }

  function balanceOf (address _user) public view returns (uint256) {
    return balance[_user];
  }

  // 0x7eee288d
  function unlock (address _user, uint256 _amount) external needSuggest {
    uint256 actualFee = fee;
    if (_amount > fee) {
      uint256 value = _amount - fee;
      token.transfer(_user, value);
    } else {
      actualFee = _amount;
    }
    address[] storage sign = pSign[tempPID];
    uint256 part = actualFee / sign.length;
    for (uint256 i = 0; i < sign.length; i++) {
      balance[sign[i]] += part;
    }
    emit Unlock(_user, _amount, actualFee);
  }

  // 0x69fe0e2d
  function setFee (uint256 _fee) external needSuggest {
    fee = _fee;
    emit UpdateFee(_fee);
  }

  function withdraw () external {
    uint256 value = balance[msg.sender];
    require(value > 0, "no balance");
    balance[msg.sender] = 0;
    token.transfer(msg.sender, value);
  }
}
