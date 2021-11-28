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
const UBE_FACTORY_ABI = require('../abis/ube-factory.json')
const UBE_PAIR_ABI = require('../abis/ube-pair.json')

const UBE_FACTORY_ADDRESS = '0x62d5b84bE28a183aBB507E125B384122D2C25fAE' // on mainnet and alfajores
const CELO_ADDRESS_ALFAJORES = '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9' // todo move to constants file

/**
 * Get the value of unclaimed farming rewards in cUSD
 *
 * @param kit
 * @param farmBot
 * @param _walletAddress
 */
async function unclaimedRewardValueInCELOWei(kit: ContractKit, farmBot: FarmBotContract, _walletAddress: string) {
  const stakingRewardsContractAddress = await getStakingRewardsContractAddress(farmBot)
  const stakingRewards = new kit.web3.eth.Contract(STAKING_REWARDS_ABI, stakingRewardsContractAddress)
  console.log(`Getting farm bot's earnings in StakingRewards contract`)
  const earnings = await stakingRewards.methods.earned(FARM_BOT_ADDRESS_ALFAJORES).call()
  const rewardsTokenAddress = await stakingRewards.methods.rewardsToken().call()
  return CELOWeiValue(kit, rewardsTokenAddress, parseInt(earnings))
}

async function CELOWeiValue(kit: ContractKit, tokenAddress: string, amountOfToken: number): Promise<number> {
  const exchangeRate = await getExchangeRate(kit, CELO_ADDRESS_ALFAJORES, tokenAddress)
  return exchangeRate * amountOfToken
}

/**
 * Returns the exchange rate between token1 and token2.
 *
 * For example, if token1 is cUSD and token2 is cEUR, return value should be around 1.13, since
 *  1.13 USD is worth 1 Euro (at time of writing).
 *
 * @param kit
 * @param token1Address
 * @param token2Address
 */
async function getExchangeRate(kit: ContractKit, token1Address: string, token2Address: string): Promise<number> {
  if (token1Address === token2Address) {
    return 1
  }
  console.log(`Getting exchange rate from ${token1Address} to ${token2Address}`)
  const ubeFactory = new kit.web3.eth.Contract(UBE_FACTORY_ABI, UBE_FACTORY_ADDRESS)
  const pairAddress = await ubeFactory.methods.getPair(token1Address, token2Address).call()
  const pairContract = new kit.web3.eth.Contract(
    UBE_PAIR_ABI,
    pairAddress
  )
  const { reserve0, reserve1 } = await pairContract.methods.getReserves().call();

  const numerator = 997 * reserve0;
  const denominator = reserve1 * 1000 + 997;
  const exchangeRate = numerator / denominator;

  return token1Address < token2Address ? 1 / exchangeRate : exchangeRate
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

  const balance = await unclaimedRewardValueInCELOWei(kit, farmBot, walletAddress)
  // todo save gas cost to file and use as threshold for whether to claim rewards
  if (balance > 1) {
    const {status, gasUsed: _gasUsedGWei} = await claimRewards(farmBot, walletAddress)
    assert.ok(status)
  } else {
    console.log('Not enough balance to claim. Doing nothing.')
  }
}

main().catch(console.error)
