import {claimRewards, getFarmBotContract, getKit} from "../src/farm-bot-api"
import assert from "assert"

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

  const claimRewardsResult = await claimRewards(farmBot, walletAddress)
  assert.ok(claimRewardsResult.status)
}

main().catch(console.error)
