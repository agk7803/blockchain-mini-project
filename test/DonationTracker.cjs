const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DonationTracker Smart Contract", function () {
  let donationTracker;
  let admin;
  let donor1;
  let donor2;
  let nonAdmin;

  beforeEach(async function () {
    [admin, donor1, donor2, nonAdmin] = await ethers.getSigners();

    const DonationTrackerFactory = await ethers.getContractFactory("DonationTracker");
    donationTracker = await DonationTrackerFactory.deploy();
    await donationTracker.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("Should set the deployer as the contract administrator", async function () {
      expect(await donationTracker.admin()).to.equal(admin.address);
    });

    it("Should initialize with default Disaster Relief Fund campaign details", async function () {
      expect(await donationTracker.campaignName()).to.equal("Disaster Relief Fund");
      expect(await donationTracker.campaignDescription()).to.equal(
        "Support emergency relief supplies and essential resources."
      );
      expect(await donationTracker.isCampaignActive()).to.equal(true);
      expect(await donationTracker.totalDonations()).to.equal(0n);
      expect(await donationTracker.totalDisbursements()).to.equal(0n);
      expect(await donationTracker.getRemainingBalance()).to.equal(0n);
      expect(await donationTracker.donationCount()).to.equal(0n);
      expect(await donationTracker.disbursementCount()).to.equal(0n);
    });
  });

  describe("Donations", function () {
    it("Should record a valid donation and emit DonationReceived event", async function () {
      const donationAmount = ethers.parseEther("1.0");

      await expect(
        donationTracker.connect(donor1).donate({ value: donationAmount })
      )
        .to.emit(donationTracker, "DonationReceived")
        .withArgs(donor1.address, donationAmount, (val) => val > 0n);

      const totalDonations = await donationTracker.totalDonations();
      expect(totalDonations).to.equal(donationAmount);

      const remainingBalance = await donationTracker.getRemainingBalance();
      expect(remainingBalance).to.equal(donationAmount);

      const count = await donationTracker.donationCount();
      expect(count).to.equal(1n);

      const allDonations = await donationTracker.getAllDonations();
      expect(allDonations.length).to.equal(1);
      expect(allDonations[0].donor).to.equal(donor1.address);
      expect(allDonations[0].amount).to.equal(donationAmount);
    });

    it("Should reject zero-value donations", async function () {
      await expect(
        donationTracker.connect(donor1).donate({ value: 0n })
      ).to.be.revertedWith("Donation amount must be greater than zero");
    });

    it("Should correctly update totals with multiple donations", async function () {
      const amount1 = ethers.parseEther("1.5");
      const amount2 = ethers.parseEther("2.5");

      await donationTracker.connect(donor1).donate({ value: amount1 });
      await donationTracker.connect(donor2).donate({ value: amount2 });

      expect(await donationTracker.totalDonations()).to.equal(ethers.parseEther("4.0"));
      expect(await donationTracker.donationCount()).to.equal(2n);
      expect(await donationTracker.getRemainingBalance()).to.equal(ethers.parseEther("4.0"));
    });
  });

  describe("Disbursements", function () {
    beforeEach(async function () {
      // Seed with 5 ETH donation
      await donationTracker.connect(donor1).donate({ value: ethers.parseEther("5.0") });
    });

    it("Should allow administrator to record a valid disbursement", async function () {
      const disburseAmount = ethers.parseEther("2.0");
      const purpose = "Emergency medical and food supplies";

      await expect(
        donationTracker.connect(admin).recordDisbursement(disburseAmount, purpose)
      )
        .to.emit(donationTracker, "FundsDisbursed")
        .withArgs(admin.address, disburseAmount, purpose, (val) => val > 0n);

      expect(await donationTracker.totalDisbursements()).to.equal(disburseAmount);
      expect(await donationTracker.getRemainingBalance()).to.equal(ethers.parseEther("3.0"));
      expect(await donationTracker.disbursementCount()).to.equal(1n);

      const allDisbursements = await donationTracker.getAllDisbursements();
      expect(allDisbursements.length).to.equal(1);
      expect(allDisbursements[0].admin).to.equal(admin.address);
      expect(allDisbursements[0].amount).to.equal(disburseAmount);
      expect(allDisbursements[0].purpose).to.equal(purpose);
    });

    it("Should reject disbursement attempts by non-administrators", async function () {
      const disburseAmount = ethers.parseEther("1.0");
      const purpose = "Unauthorized disbursement attempt";

      await expect(
        donationTracker.connect(nonAdmin).recordDisbursement(disburseAmount, purpose)
      ).to.be.revertedWith("Access denied: Only administrator can perform this action");
    });

    it("Should reject a disbursement exceeding the remaining recorded balance", async function () {
      const excessiveAmount = ethers.parseEther("6.0"); // Total donations is 5.0 ETH
      const purpose = "Exceeding balance disbursement";

      await expect(
        donationTracker.connect(admin).recordDisbursement(excessiveAmount, purpose)
      ).to.be.revertedWith("Disbursement amount exceeds remaining balance");
    });

    it("Should reject a zero-value disbursement", async function () {
      await expect(
        donationTracker.connect(admin).recordDisbursement(0n, "Zero disbursement")
      ).to.be.revertedWith("Disbursement amount must be greater than zero");
    });

    it("Should reject an empty disbursement purpose description", async function () {
      await expect(
        donationTracker.connect(admin).recordDisbursement(ethers.parseEther("1.0"), "")
      ).to.be.revertedWith("Disbursement purpose cannot be empty");
    });
  });

  describe("Summary View", function () {
    it("Should return full summary matching current state", async function () {
      await donationTracker.connect(donor1).donate({ value: ethers.parseEther("3.0") });
      await donationTracker.connect(admin).recordDisbursement(ethers.parseEther("1.0"), "Logistics");

      const summary = await donationTracker.getSummary();
      expect(summary._campaignName).to.equal("Disaster Relief Fund");
      expect(summary._isCampaignActive).to.equal(true);
      expect(summary._totalDonations).to.equal(ethers.parseEther("3.0"));
      expect(summary._totalDisbursements).to.equal(ethers.parseEther("1.0"));
      expect(summary._remainingBalance).to.equal(ethers.parseEther("2.0"));
      expect(summary._donationCount).to.equal(1n);
      expect(summary._disbursementCount).to.equal(1n);
      expect(summary._admin).to.equal(admin.address);
    });
  });
});
