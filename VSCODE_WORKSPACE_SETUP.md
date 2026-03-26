# VS Code Workspace Setup Guide

This document contains the terminal commands and folder tree structure that Kilo (Systems Architect) should generate to scaffold the P31 Labs ecosystem for parallel agentic work.

---

## 1. Folder Tree Structure

```
p31labs-andromeda/
├── CONSTITUTION.md              # Core governance document
├── README.md                    # Project overview
├── .vscode/
│   └── settings.json           # Workspace settings
├── GOVERNANCE/                  # Governance documents
│   ├── ABDICATION_PROTOCOL.md
│   ├── KNOWN_TRUTHS.md
│   └── NODE_ROSTER.md
├── BONDING/                     # BONDING game (existing)
│   └── ...
├── P31-SOVEREIGN-SDK/           # SDK for sovereign identity
│   ├── src/
│   │   ├── index.ts
│   │   └── types.ts
│   └── package.json
├── NODE-ONE-FIRMWARE/           # ESP32 firmware
│   ├── src/
│   │   └── main.cpp
│   └── platformio.ini
├── interfaces/                  # Abstract interfaces
│   ├── IAbdicationProtocol.ts
│   ├── IKnownTruths.ts
│   └── INodeRegistry.ts
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   └── DEPLOYMENT.md
└── tests/                       # Test suites
    ├── abdication.test.ts
    └── node-verification.test.ts
```

---

## 2. Terminal Commands

### Step 1: Initialize Repository Structure

```bash
# Create main directories
mkdir -p GOVERNANCE BONDING P31-SOVEREIGN-SDK NODE-ONE-FIRMWARE interfaces docs tests/INTEGRATION

# Create .vscode directory
mkdir -p .vscode
```

### Step 2: Create Initial Files

```bash
# Create CONSTITUTION.md
touch CONSTITUTION.md

# Create README.md
touch README.md

# Create .vscode settings
touch .vscode/settings.json
```

### Step 3: Initialize Node.js Projects (where applicable)

```bash
# P31-SOVEREIGN-SDK
cd P31-SOVEREIGN-SDK
npm init -y
npm install typescript @types/node --save-dev

# Return to root
cd ..
```

### Step 4: Verify Structure

```bash
# List all created directories
find . -type d -maxdepth 2 | sort

# Verify key files exist
ls -la CONSTITUTION.md README.md
```

---

## 3. Execution Order

1. **Kilo** uses commands from Section 2 to scaffold the folder structure
2. Kilo creates interface files in `interfaces/` directory
3. **Kwaipilot** implements logic in `src/core/` and writes tests in `tests/`
4. Both agents reference this document for terminal commands

---

## 4. Key Conventions

| Convention | Purpose |
|------------|----------|
| `.lock` files | Prevent concurrent edits |
| `// Interface from Kilo` | Comment linking to architect's design |
| `// Implementation by Kwaipilot` | Comment linking to engine's code |
| `WCD-*.md` prefix | Work Control Documents in root |

---

## 5. Quick Start Commands

```bash
# Full scaffold (run from project root)
mkdir -p GOVERNANCE BONDING P31-SOVEREIGN-SDK NODE-ONE-FIRMWARE interfaces docs tests/INTEGRATION .vscode

# List structure
tree -L 2 --dirsfirst

# Check git status
git status
```

---

*Last Updated: 2026-03-24*
