//SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FarmBot {
    address public owner;

    constructor(address _owner) {
        console.log("Deploying a Greeter with owner:", _owner);
        owner = _owner;
    }

    // deposits can be done without a dedicated method (just send funds to the contract address)

    function withdraw(address token, uint256 amount) {
        require(msg.sender == owner, "Only the owner can withdraw");
        IERC20(token).transfer(msg.sender, amount);
    }
}
