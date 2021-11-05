const {newKit, StableToken} = require('@celo/contractkit')
const assert = require('assert')
const farmBotJson = require('../artifacts/farm-bot/codebase/contracts/farm-bot.sol/FarmBot.json')

const FARM_BOT_ABI = farmBotJson.abi
const FORNO_ALFAJORES_URL = 'https://alfajores-forno.celo-testnet.org'
const FARM_BOT_ADDRESS_ALFAJORES = '0xbdC629D7132f111f7bE2Ab54BB2C69F25B1b0046'

async function getKit(privateKey) {
  const kit = await newKit(FORNO_ALFAJORES_URL)
  const account = kit.web3.eth.accounts.privateKeyToAccount(privateKey)
  kit.web3.eth.accounts.wallet.add(account)
  kit.web3.eth.defaultAccount = account.address
  console.log('Getting account with address ' + account.address)
  return kit
}

async function approve(kit, amount) {
  const walletAddress = kit.web3.eth.defaultAccount
  const cusdContract = await kit.contracts.getStableToken(StableToken.cUSD)
  const approveTx = await cusdContract.approve(FARM_BOT_ADDRESS_ALFAJORES, amount).send({
    from: walletAddress,
    gas: 50000,
    gasPrice: 1000000000
  })
  return approveTx.waitReceipt()
}

function getFarmBotContract(kit) {
  return new kit.web3.eth.Contract(FARM_BOT_ABI, FARM_BOT_ADDRESS_ALFAJORES)
}

async function deposit(kit, amount) {
  const farmBotContract = getFarmBotContract(kit)
  return farmBotContract.methods.deposit(amount).send({
    from:kit.web3.eth.defaultAccount,
    gas: 99000,
    gasPrice: 1000000000,
  })
}

async function withdraw(kit, amount) {
  const farmBotContract = getFarmBotContract(kit)
  return farmBotContract.methods.withdraw(amount).send({
    from: kit.web3.eth.defaultAccount,
    gas: 99000,
    gasPrice: 1000000000,
  })
}

async function main() {
  const kit1 = await getKit(process.env.ALFAJORES_WALLET_PRIVATE_KEY)
  const amount = kit1.web3.utils.toWei('0.1', 'ether')
  const approveResult = await approve(kit1, amount)
  assert.equal(approveResult.status, true, 'Unexpected approve result')

  const depositResult = await deposit(kit1, amount)
  assert.equal(depositResult.status, true, 'Unexpected deposit result')

  const kit2 = await getKit(process.env.ALFAJORES_WALLET_PRIVATE_KEY_2)
  try {
    await withdraw(kit2, amount) // should fail (none deposited!)
  } catch (error) {
    if (!error.message.includes('Transaction has been reverted by the EVM')) {
      throw error
    }
  }
  const user1withdrawResult = await withdraw(kit1, amount) // should pass
  assert.equal(user1withdrawResult.status, true, 'User 1 should be able to withdraw since they deposited already')
}

main()
