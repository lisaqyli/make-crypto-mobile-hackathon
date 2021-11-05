//SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "hardhat/console.sol";
import "./ubeswap-farming/contracts/StakingRewards.sol"; // does the ierc20 import too

contract FarmBot {
    mapping(address => uint256) private _balances;

    address public tokenAddress = 0xf3098223845F37Ffe4B3A066F2D38A0587317269; // mcUSD-Celo
    address public farm = StakingRewards(0x299f31f48D4667a6f68E4331dB05212d57Cc7f80); // alfajores farm for mcUSD-Celo

    function deposit(uint256 amount) public {
        // todo might need a lock on this
        bool transferSuccess = IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        require(transferSuccess, "Transfer failed, aborting deposit");
        _balances[msg.sender] += amount;
    }

    function withdraw(uint256 amount) public {
        // todo might need a lock on this
        require(_balances[msg.sender] >= amount, "Only the owner can withdraw");
        bool transferSuccess = IERC20(tokenAddress).transfer(msg.sender, amount);
        require(transferSuccess, "Transfer failed, aborting withdrawal");
        _balances[msg.sender] -= amount;
    }

    function investInFarm() public {
        // todo eventually make private. The public function will do more: reap rewards, swap them, obtain LP tokens, and then this.
        uint256 tokenBalance = IERC20(tokenAddress).balanceOf(address(this));
        require(tokenBalance > 0, "Cannot invest in farm because tokenBalance is 0");
        IERC20(tokenAddress).approve(address(farm), tokenBalance);
        farm.stake(tokenBalance); // fixme compilation error: TypeError: Member "stake" not found or not visible after argument-dependent lookup in address.
    }
}
