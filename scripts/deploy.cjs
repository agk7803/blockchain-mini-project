const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("--------------------------------------------------");
  console.log("🚀 Deploying DonationTracker to local blockchain...");

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer (Administrator) Address: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${hre.ethers.formatEther(balance)} ETH`);

  // Deploy Contract
  const DonationTrackerFactory = await hre.ethers.getContractFactory("DonationTracker");
  const donationTracker = await DonationTrackerFactory.deploy();
  await donationTracker.waitForDeployment();

  const deployedAddress = await donationTracker.getAddress();
  console.log(`✅ DonationTracker successfully deployed to: ${deployedAddress}`);

  // Fetch ABI from compiled artifacts
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/DonationTracker.sol/DonationTracker.json"
  );

  let abi = [];
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abi = artifact.abi;
  }

  // Save configuration to src/contractConfig.json for seamless React frontend integration
  const configDir = path.join(__dirname, "../src");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, "contractConfig.json");
  const contractConfig = {
    address: deployedAddress,
    admin: deployer.address,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    abi: abi
  };

  fs.writeFileSync(configPath, JSON.stringify(contractConfig, null, 2));
  console.log(`💾 Saved frontend configuration to: ${configPath}`);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
