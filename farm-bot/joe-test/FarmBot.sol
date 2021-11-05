//SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "../../openzeppelin-solidity/contracts/Math.sol";
import "../../openzeppelin-solidity/contracts/SafeMath.sol";
import "../../openzeppelin-solidity/contracts/SafeERC20.sol";

import "./interfaces/IStakingRewards.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";

contract FarmBot {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    mapping(address => uint256) private _balances;       // Balances of unstaked LP tokens held by the contract
    mapping(address => uint256) private _stakedBalances; // Balances of staked LP tokens stored in the StakingRewards contract
    mapping(address => uint256) private _rewards;        // Balances of claimed rewardsToken held by the contract
    mapping(address => bool) private _compound;          // Whether or not a user's rewards should be autocompounded

    address[] private _users;                            // List of users, used for iterating over above mappings. Functions as a set that cannot be removed from.
    mapping(address => bool); private _userExists;       // Used to check the existence of a user.

    uint256 public totalStaked;            // Total amount currently staked
    uint256 public totalRewards;           // Total amount of rewardsToken held by this contract

    IStakingRewards public stakingRewards; // StakingRewards contract address
    IERC20 public rewardsToken;            // Farming reward token
    IUniswapV2Pair public stakingToken;    // Staked token for farming (UBE LP token)
    IUniswapV2Router public router;        // Ubeswap Router

    IERC20 public token0;                  // UBE LP tokenA
    IERC20 public token1;                  // UBE LP tokenB

    address[] public path0;                // Path to route rewardsToken to token0 when compounding
    address[] public path1;                // Path to route rewardsToken to token1 when compounding

    constructor(address _stakingRewards, address _router, address[] _path0, address[] _path1) {
        stakingRewards = IERC20(_stakingRewards);
	rewardsToken = IERC20(stakingRewards.rewardsToken);
	stakingToken = IUniswapV2Pair(stakingRewards.stakingToken);
	token0 = IERC20(stakingToken.token0);
	token1 = IERC20(stakingToken.token1);
	path0 = _pathA;
	path1 = _pathB;
	router = IUniswapV2Router(_router)
    }

    /* Autocompounding multi-user farm. Since all LP tokens from all users will be
     * staked in the same farm, whenever a user stakes or unstakes their own LP from the
     * farm, we need to claim the rewards for all users. We do this in order to avoid
     * issues with prorating rewards based on the *time* that user's LP has been in the farm.
     *
     * If we claim whenever the balance of LP in the farm changes, each user's "share" of the
     * bot's staked LP will not need to be prorated w.r.t. time, since all LP has been in the farm
     * for the same duration since the last claim event. All we need to do is keep track
     * of each user's fraction of the total staked LP; when we claim rewards, each
     * user is entitled to a portion of the reward proportional to their fraction of total staked LP.
     */

    // Deposit LP token into contract.
    function depositLP(uint256 amount) public {
        bool transferSuccess = stakingToken.transferFrom(msg.sender, address(this), amount);
        require(transferSuccess, "Transfer failed, aborting deposit");
        _balances[msg.sender] += amount;
	if (!(_userExists[msg.sender])) {
	    _users.push(msg.sender)
	}
    }

    // Withdraw LP token from contract.
    function withdrawLP(uint256 amount) public {
        require(_balances[msg.sender] >= amount, "Must have non-zero balance to withdraw");
        bool transferSuccess = stakingToken.transfer(msg.sender, amount);
        require(transferSuccess, "Transfer failed, aborting withdrawal");
        _balances[msg.sender] -= amount;
    }

    // Stake all LP token into farm for one user. Before staking, we need to claim everyone's rewards.
    function stakeLP() public claim {
	stakeLPForAddress(msg.sender)
    }

    // Unstake all LP token from farm for one user. Before unstaking, we need to claim everyone's rewards.
    function unstakeLP() public claim {
        require(_stakedBalances[msg.sender] >= 0, "Must have non-zero staked balance to unstake");
	stakingToken.withdraw(_stakedBalances[msg.sender]);
	totalStaked -= _stakedBalances[msg.sender];
	_balances[msg.sender] += _stakedBalances[msg.sender]
	_stakedBalances[msg.sender] = 0;
	// We disable compounding for this user's rewards when they unstake, so that future calls to
	// compound do not reinvest any rewards that this user may have claimed.
	_compound[msg.sender] = false;
    }

    // Claims all rewards for all users in the farm.
    modifier claim {
	uint256 rewards = stakingRewards.rewards(address(this));
	if (rewards > 0) {
	    stakingRewards.getReward();
	    totalRewards += rewards
	    for (uint i=0; i<_users.length; i++) {
		// Allocate a fraction of the claims rewardsToken to each user proportional
		// to their current share of the staked LP.
		_rewards[_users[i]] = (_stakedBalances[_users[i]] * rewards) / totalStaked;
	    }
	}
    }

    // Public wrapper for claiming user rewards.
    function claimAll() public claim {}

    // Stakes all LP for a given address. Used internally when compounding rewards.
    function stakeLPForAddress(address _address) private {
        require(_balances[_address] >= 0, "Must have non-zero balance to stake");
	stakingToken.stake(amount);
	require(transferSuccess, "Transfer failed, aborting withdrawal");
	_stakedBalance[_address] += _balances[_address];
	totalStaked += _balances[_address]
	_balances[_address] = 0;
	// Enable compounding for this user, since they're now staking LP.
	_compound[_address] = true;
    }

    // Compounds rewards for all users. Converts all rewardsToken held by the contract into
    // equal parts token0 and token1, exchanges for LP token, and stakes proportional LP for each user.
    function compound() public claim {
	// THE FOLLOWING IS PSEUDOCODE! the contract calls are much more complicated than this and
	// require additional bookkeeping/arguments/contract calls to work correctly.

	// Split rewards in half
	uint256 halfRewards = totalRewards / 2;

	// Swap for token0
	uint256 amountToken0 = router.swapTokensForExactTokens(halfRewards, path0, address(this));
	// Swap for token1
	uint256 amountToken1 = router.swapTokensForExactTokens(halfRewards, path1, address(this));

	// Stake token0/token1 and get LP
	uint256 amountLP = router.addLiquidity(token0, token1, amountToken0, amountToken1, address(this));

	// Each user is entitled to LP equal to their share of rewardsToken previously held by this contract
	for (uint i=0; i<_users.length; i++) {
	    _balances[_users[i]] = (_rewards[_users[i]] * amountLP) / totalRewards;
	    _rewards[_users[i]] = 0
	}

	// We've claimed LP and allocated it to users; no more unclaimed rewards should remain.
	totalRewards = 0;

	// Each user who had rewards should now have a non-zero balance. Stake their new LP
	// into the farm and perform bookkeeping. Note that the private stakeLPForAddress does not
	// call the claim modifier, since we claim at the beginning of the compound call. It's necessary
	// to claim at the beginning of this function, since we MUST claim for all users before changing
	// the amount of LP staked in the farm to avoid time-related prorating issues.
	for (uint i=0; i<_users.length; i++) {
	    stakeLPForAddress(_users[i])
	}
    }
}
