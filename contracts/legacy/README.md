# Legacy Contracts

This directory contains archived contracts that are no longer actively developed but kept for reference.

## ButterRouterV2

- **Status**: Archived (2024)
- **Solidity Version**: 0.8.20
- **Description**: Previous version of the Butter Router contract
- **Note**: This directory is excluded from compilation

## Directory Structure

```
legacy/
├── ButterRouterV2.sol          # Main V2 router contract
├── interface/
│   ├── IButterMosV2.sol        # V2 MOS interface
│   └── IButterRouterV2.sol     # V2 router interface
├── abstract/
│   └── Router.sol              # V2 base router (copy)
└── lib/
    ├── ErrorMessage.sol        # V2 error messages (copy)
    └── Helper.sol              # V2 helper functions (copy)
```

## Usage

These files are kept for:
- Code reference and comparison
- Understanding migration path from V2 to V3/V31
- Documentation purposes

**Note**: These contracts are NOT compiled as part of the main build process.
