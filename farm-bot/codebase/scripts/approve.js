const {newKit, StableToken} = require('@celo/contractkit')

const FORNO_ALFAJORES_URL = 'https://alfajores-forno.celo-testnet.org'
const FARM_BOT_ADDRESS_ALFAJORES = '0xbdC629D7132f111f7bE2Ab54BB2C69F25B1b0046'

async function approve() {
  const kit = await newKit(FORNO_ALFAJORES_URL)
  const account = kit.web3.eth.accounts.privateKeyToAccount(process.env.ALFAJORES_WALLET_PRIVATE_KEY)
  kit.web3.eth.accounts.wallet.add(account)
  kit.web3.eth.defaultAccount = account.address
  console.log(`wallet address: ${account.address}`)
  const cusdContract = await kit.contracts.getStableToken(StableToken.cUSD)
  const approveTx = await cusdContract.approve(FARM_BOT_ADDRESS_ALFAJORES, kit.web3.utils.toWei('1', 'ether')).send({from: account.address, gas: 50000, gasPrice: 1000000000})
  return approveTx.waitReceipt()
}

approve()
