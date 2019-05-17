pragma solidity ^0.5.0;

library AddressUtils {
  function isContract(address _addr) internal view returns (bool) {
    uint256 size;
    // solium-disable-next-line security/no-inline-assembly
    assembly { size := extcodesize(_addr) }
    return size > 0;
  }
}

contract MultiSign {
  using AddressUtils for address;

  enum State { Empty, Pending, Success, Fail }

  address public target;

  mapping (address => uint256) internal whiteListIndex;
  mapping (uint256 => address) internal whiteList;
  uint256 public whiteListSize;
  uint256 public threshold;

  bytes32 internal tempPID;

  mapping (bytes32 => State) internal proposalState;
  mapping (bytes32 => bytes) internal proposal;
  mapping (bytes32 => bool) internal selfProposal;
  mapping (bytes32 => bytes32) internal pProof;
  mapping (bytes32 => uint256) internal pUpdateAt;
  mapping (bytes32 => address[]) internal pSign;
  mapping (bytes32 => mapping (address => bool)) internal pConfirm;

  event AddWhiteList (address member);
  event RemoveWhiteList (address member);

  event PendingProposal (bytes32 indexed pid);
  event PassProposal (bytes32 indexed pid, State state, address[] sign);

  constructor (address _target, uint256 _threshold, address[] memory _whiteList) public {
    require(_target.isContract() || _target == address(this), "target must be a contract");
    require(_threshold <= _whiteList.length, "too high threshold");
    target = _target;
    threshold = _threshold;
    for (uint256 i = 0; i < _whiteList.length; i++) {
      _addWhiteList(_whiteList[i]);
    }
  }

  modifier needSuggest () {
    require(msg.sender == address(this), "insufficient permissions");
    _;
  }

  modifier onlyInWhiteList () {
    require(isInWhiteList(msg.sender), "insufficient permissions");
    _;
  }

  function getProposal (bytes32 _pid) public view returns (
    State state,
    bytes memory data,
    bool self,
    bytes32 proof,
    uint256 updateAt,
    address[] memory sign
  ) {
    state = proposalState[_pid];
    data = proposal[_pid];
    self = selfProposal[_pid];
    proof = pProof[_pid];
    updateAt = pUpdateAt[_pid];
    sign = pSign[_pid];
  }

  function checkProposal (bytes32 _pid) public {
    address[] storage sign = pSign[_pid];
    uint256 votes = 0;
    for (uint256 i = 0; i < sign.length; i++) {
      if (isInWhiteList(sign[i])) {
        votes++;
        if (votes >= threshold) {
          _execProposal(_pid);
          break;
        }
      }
    }
  }

  function suggestIssue (bytes32 _proof, bytes calldata _data, bool _self) external onlyInWhiteList {
    bytes32 pid = keccak256(abi.encodePacked(_proof, _data, _self));

    State state = proposalState[pid];
    if (state == State.Success || state == State.Fail) {
      return;
    }

    // solium-disable-next-line security/no-block-members
    pUpdateAt[pid] = now;

    if (!pConfirm[pid][msg.sender]) {
      pSign[pid].push(msg.sender);
      pConfirm[pid][msg.sender] = true;
    }

    if (state == State.Empty) {
      proposalState[pid] = State.Pending;
      selfProposal[pid] = _self;
      proposal[pid] = _data;
      pProof[pid] = _proof;
      emit PendingProposal(pid);
    }

    checkProposal(pid);
  }

  function isInWhiteList (address _addr) public view returns (bool) {
    return whiteListIndex[_addr] > 0;
  }

  // 0xe7cd4a04
  function addWhiteList (address _member) external needSuggest {
    _addWhiteList(_member);
  }
  // 0x2042e5c2
  function removeWhiteList (address _member) external needSuggest {
    require(isInWhiteList(_member), "address is not in the white list");
    if (whiteList[whiteListSize] != _member) {
      whiteList[whiteListIndex[_member]] = whiteList[whiteListSize];
    }
    whiteListSize--;
    whiteListIndex[_member] = 0;
    emit RemoveWhiteList(_member);
  }
  // 0x960bfe04
  function setThreshold (uint256 _threshold) external needSuggest {
    require(_threshold <= whiteListSize, "too high threshold");
    threshold = _threshold;
  }

  function _addWhiteList (address _member) internal {
    require(whiteListIndex[_member] == 0, "address is already in the white list");
    whiteListSize++;
    whiteListIndex[_member] = whiteListSize;
    whiteList[whiteListSize] = _member;
    emit AddWhiteList(_member);
  }

  function _execProposal (bytes32 _pid) internal returns (bytes memory) {
    require(proposalState[_pid] == State.Pending, "proposal status error");
    bytes storage data = proposal[_pid];
    address t = selfProposal[_pid] ? address(this) : target;
    proposalState[_pid] = State.Fail;
    tempPID = _pid;
    // solium-disable-next-line security/no-low-level-calls
    (bool success, bytes memory res) = t.call(data);
    if (success) {
      proposalState[_pid] = State.Success;
    }
    emit PassProposal(_pid, proposalState[_pid], pSign[_pid]);
    return res;
  }
}
