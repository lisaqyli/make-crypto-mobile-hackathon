import {
  claimRewards,
  FARM_BOT_ADDRESS_ALFAJORES,
  FarmBotContract,
  getFarmBotContract,
  getKit,
  getStakingRewardsContractAddress
} from "../src/farm-bot-api"
import assert from "assert"
import {ContractKit} from "@celo/contractkit"
const STAKING_REWARDS_ABI = require('../abis/staking-rewards.json')

async function stakingTokenBalance(kit: ContractKit, farmBot: FarmBotContract, _walletAddress: string) {
  const stakingRewardsContractAddress = await getStakingRewardsContractAddress(farmBot)
  const stakingRewards = new kit.web3.eth.Contract(STAKING_REWARDS_ABI, stakingRewardsContractAddress)
  const earnings = await stakingRewards.methods.earned(FARM_BOT_ADDRESS_ALFAJORES).call()
  return parseInt(earnings)
}

/**
 * Claim and re-invest rewards for a farm bot contract.
 *
 * Farm bot will re-invest the rewards to earn compound interest on the rewards.
 *
 * The wallet calling the farm bot method will also receive a bounty proportional to the amount of rewards the contract
 *  has earned since the last time rewards were claimed/reinvested.
 */
async function main(){
  const privateKey = process.env.ALFAJORES_WALLET_PRIVATE_KEY
  assert.ok(privateKey)
  const kit = await getKit(privateKey)
  const walletAddress = kit.web3.eth.defaultAccount
  assert.ok(walletAddress)
  const farmBot = getFarmBotContract(kit)

  const balance = await stakingTokenBalance(kit, farmBot, walletAddress)
  if (balance > 1) { // todo convert to cUSD and compare to configurable threshold value
    const claimRewardsResult = await claimRewards(farmBot, walletAddress)
    assert.ok(claimRewardsResult.status)
  } else {
    console.log('Not enough balance to claim. Doing nothing.')
  }
}

main().catch(console.error)
