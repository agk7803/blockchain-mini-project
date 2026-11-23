// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DonationTracker
 * @dev College Mini-Project: Blockchain-Based Donation Tracking System.
 * Records transparent public donations and administrator-governed fund disbursements.
 */
contract DonationTracker {
    // Administrator address (the deployer of the contract)
    address public admin;

    // Default Campaign Details
    string public campaignName;
    string public campaignDescription;
    bool public isCampaignActive;

    // Financial & Counter State Variables
    uint256 public totalDonations;        // In Wei
    uint256 public totalDisbursements;    // In Wei
    uint256 public donationCount;
    uint256 public disbursementCount;

    // Structure for tracking individual donations
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    // Structure for tracking recorded fund disbursements
    struct Disbursement {
        address admin;
        uint256 amount;
        string purpose;
        uint256 timestamp;
    }

    // Storage arrays for audit trail
    Donation[] public donations;
    Disbursement[] public disbursements;

    // Events emitted for transparent blockchain tracking
    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    event FundsDisbursed(
        address indexed admin,
        uint256 amount,
        string purpose,
        uint256 timestamp
    );

    /**
     * @dev Restricts execution to the contract administrator only.
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "Access denied: Only administrator can perform this action");
        _;
    }

    /**
     * @dev Sets up initial campaign and assigns deployer as admin.
     */
    constructor() {
        admin = msg.sender;
        campaignName = "Disaster Relief Fund";
        campaignDescription = "Support emergency relief supplies and essential resources.";
        isCampaignActive = true;
    }

    /**
     * @notice Allows any user to donate ETH to the active campaign.
     */
    function donate() external payable {
        require(isCampaignActive, "Campaign is currently not active");
        require(msg.value > 0, "Donation amount must be greater than zero");

        // Checks-Effects-Interactions: update state before external interaction
        totalDonations += msg.value;
        donationCount += 1;

        donations.push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Calculates the remaining recorded balance available for disbursement.
     * @return remaining recorded balance in Wei
     */
    function getRemainingBalance() public view returns (uint256) {
        return totalDonations - totalDisbursements;
    }

    /**
     * @notice Allows the administrator to record a verified fund disbursement.
     * @param _amount The amount of funds disbursed in Wei.
     * @param _purpose Brief description/purpose of disbursement (e.g., 'Emergency food supplies').
     */
    function recordDisbursement(uint256 _amount, string calldata _purpose) external onlyAdmin {
        require(_amount > 0, "Disbursement amount must be greater than zero");
        require(bytes(_purpose).length > 0, "Disbursement purpose cannot be empty");
        require(getRemainingBalance() >= _amount, "Disbursement amount exceeds remaining balance");

        totalDisbursements += _amount;
        disbursementCount += 1;

        disbursements.push(Disbursement({
            admin: msg.sender,
            amount: _amount,
            purpose: _purpose,
            timestamp: block.timestamp
        }));

        emit FundsDisbursed(msg.sender, _amount, _purpose, block.timestamp);
    }

    /**
     * @notice Convenience function to retrieve full campaign & financial summary.
     */
    function getSummary() external view returns (
        string memory _campaignName,
        string memory _campaignDescription,
        bool _isCampaignActive,
        uint256 _totalDonations,
        uint256 _totalDisbursements,
        uint256 _remainingBalance,
        uint256 _donationCount,
        uint256 _disbursementCount,
        address _admin
    ) {
        return (
            campaignName,
            campaignDescription,
            isCampaignActive,
            totalDonations,
            totalDisbursements,
            getRemainingBalance(),
            donationCount,
            disbursementCount,
            admin
        );
    }

    /**
     * @notice Retrieve all recorded donations.
     */
    function getAllDonations() external view returns (Donation[] memory) {
        return donations;
    }

    /**
     * @notice Retrieve all recorded disbursements.
     */
    function getAllDisbursements() external view returns (Disbursement[] memory) {
        return disbursements;
    }
}
