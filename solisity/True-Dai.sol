pragma solidity ^0.5.0;

library SafeMath {
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
      assert(b <= a);
      return a - b;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
      uint256 c = a + b;
      assert(c >= a);
      return c;
  }
}

contract TrueDai {
  using SafeMath for uint256;

  string public constant name = "True Dai Token";
  string public constant symbol = "TDAI";
  uint256 public constant decimals = 18;
  address payable public founder;
  uint256 public totalSupply;

  mapping (address => uint256) internal balances;
  mapping (address => mapping (address => uint256)) internal allowed;

  event Transfer (address indexed _from, address indexed _to, uint256 _value);
  event Approval (address indexed _owner, address indexed _spender, uint256 _value);

  event Mint (address indexed user, uint256 value);
  event Burn (address indexed user, uint256 value);

  constructor () public {
    founder = msg.sender;
  }

  function balanceOf (address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }

  function transfer (address _to, uint256 _value) public returns (bool success) {
    require (_to != address(0), "");
    require((balances[msg.sender] >= _value), "");
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  function transferFrom (address _from, address _to, uint256 _value) public returns (bool success) {
    require (_to != address(0), "");
    require(balances[_from] >= _value && allowed[_from][msg.sender] >= _value, "");
    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool success) {
    allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance (address _owner, address _spender) public view returns (uint256 remaining) {
    return allowed[_owner][_spender];
  }

  function mint (address _to, uint256 _amount) public {
    require(msg.sender == founder, "");

    totalSupply = totalSupply.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    emit Mint(_to, _amount);
  }

  function burn (uint256 _amount) public {
    require(balances[msg.sender] > _amount, "");

    totalSupply = totalSupply.sub(_amount);
    balances[msg.sender] = balances[msg.sender].sub(_amount);
    emit Burn(msg.sender, _amount);
  }

  function changeFounder(address payable newFounder) public {
    require(msg.sender == founder, "");

    founder = newFounder;
  }
}
