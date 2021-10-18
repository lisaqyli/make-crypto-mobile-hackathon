import { expect } from "chai";
import { ethers } from "hardhat";
import hre from 'hardhat'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {Contract} from "ethers";


describe("FarmBot", () => {
  let ube: Contract
  let deployer: SignerWithAddress;
  // let owner: SignerWithAddress;
  // let operator: SignerWithAddress;


  before(async () => {
    const signers = await hre.ethers.getSigners();

    deployer = signers[0]!;
    // owner = signers[1]!;
    // operator = signers[2]!;
  });

  beforeEach(async () => {
    const Ube = await ethers.getContractFactory("UbeToken")
    ube = await Ube.deploy(deployer)
  })

  it("Should be able to withdraw tokens from FarmBot", async () => {
    const FarmBot = await ethers.getContractFactory("FarmBot");
    const farmBot = await FarmBot.deploy(deployer.address);
    await farmBot.deployed();

    // todo send IERC20 tokens to farmBot

    // todo withdraw tokens from farmBot

    expect(!!ube).to.equal(true)

    // expect(await farmBot.greet()).to.equal("Hello, world!");
    //
    // const setGreetingTx = await farmBot.setGreeting("Hola, mundo!");
    //
    // // wait until the transaction is mined
    // await setGreetingTx.wait();
    //
    // expect(await farmBot.greet()).to.equal("Hola, mundo!");
  });
});
