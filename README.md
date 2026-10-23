# 🌾 GrainLedger — Frontend Workspace

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%206.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"From field to shipment. Every grain accounted for. Traceability starts with trust."**  
> *Cross-platform frontend system for agricultural supply chain management, Mass Balance Ledger accounting, Maximum Residue Limit (MRL) compliance, and end-to-end grain traceability.*

---

## 📖 Overview

**GrainLedger Frontend** is a multi-platform client ecosystem (Web Operations Portal & Mobile Field Application) engineered for **GrainLedger** — a modern supply chain traceability and mass ledger system designed for the grain and rice processing industry.

The platform addresses four core operational challenges:
1. **Mass Conservation & Ledger Accuracy**: Strictly monitors mass balance and allowable shrink/gain loss across multi-stage milling transformations (drying, dehulling, polishing, color sorting) using arbitrary-precision arithmetic (`decimal.js`).
2. **Chemical Residue Compliance (MRL)**: Tracks field spray schedules, pesticide declarations, and laboratory test results against target-market standards (EU, US, Japan), enforcing proactive safety margins and automated quarantine holds.
3. **Multi-tier Traceability**: Maintains an immutable operational audit trail linking agricultural plots, farmers, raw harvest intakes, silo lots, processing operations, and final export shipments.
4. **Offline-First Field Resilience**: Equips agronomists and procurement officers with mobile workflows that function seamlessly in rural areas with poor connectivity, queuing transactions locally and syncing when back online.

---

## 🏛️ Repository Structure

This repository is structured as a Monorepo containing both the Web Portal and the Mobile Field Application:

```text
GrainLedger-Frontend/
├── web/                           # Web Operations & Administration Portal
│   ├── grainledger/               # Primary production app (Vite + React 19 + Tailwind CSS)
│   │   ├── src/
│   │   │   ├── api/               # API clients (Auth, Ledger, Catalogs, Compliance, Procurement...)
│   │   │   ├── app/               # Router definitions, i18n locales (EN/VI), Global Zustand Stores
│   │   │   ├── components/        # Reusable UI system (Sidebar, Header, Badges, Modals, Loaders...)
│   │   │   ├── features/          # Core business domain modules:
│   │   │   │   ├── admin/         # Mass balance policies, facility configs, user access control
│   │   │   │   ├── audit/         # Immutable event log history & cryptographic verification
│   │   │   │   ├── auth/          # Authentication, RBAC checks, invite acceptance, password reset
│   │   │   │   ├── catalogs/      # Master data, MRL regulatory standards, customer profiles
│   │   │   │   ├── compliance/    # Lab sample tests, MRL verification, safety margin configs
│   │   │   │   ├── dashboard/     # Role-tailored operational dashboards & KPI overviews
│   │   │   │   ├── field/         # Farmer registry, plot surveys, procurement intakes
│   │   │   │   ├── mill/          # Milling operations, receiving tasks, lot movements, reconciliations
│   │   │   │   └── risk/          # Lot quarantine and safety hold management
│   │   │   └── shared/            # Utilities (Cookies, DecimalMass, Logger, Motion presets)
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── src/                       # Standalone workspace & prototype components
│
├── mobile/                        # Field & Agronomy Mobile Application
│   └── grainledger/               # React Native app (Expo SDK 58 + Expo Router)
│       ├── src/
│       │   ├── app/               # Expo file-based routes:
│       │   │   ├── (tabs)/        # Tab navigators (Dashboard, Field, Mill, Trace, Profile)
│       │   │   ├── farmer-form.tsx      # Farmer enrollment
│       │   │   ├── plot-form.tsx        # Plot registration & GPS geolocation
│       │   │   ├── spray-form.tsx       # Pre-harvest chemical spray log
│       │   │   ├── procurement-form.tsx # Wet paddy purchase receipt
│       │   │   ├── receiving-form.tsx   # Grain intake & silo assignment
│       │   │   ├── operation-form.tsx   # On-site milling batch logger
│       │   │   └── offline-queue.tsx    # Offline sync queue workbench
│       │   ├── services/          # HTTP networking client & persistent storage (AsyncStorage)
│       │   ├── store/             # Zustand application state
│       │   └── theme/             # Design tokens, color system & mobile typography
│       ├── package.json
│       └── app.json
│
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```

---

## ⚡ Key Features

### 1. 🌐 Web Operations Portal (`web/grainledger`)
- **Intake & Silo Management**: Ingests grain lots from weighbridges, inspects moisture and foreign-matter levels, and automatically checks for BR-15 quarantine holds.
- **Mill Operations Entry**: Logs conversion operations (drying, husking, milling, sorting) with live mass balance checks to guarantee conservation of mass.
- **Reconciliation & Variance Approvals**: Multi-tier review workflow for handling operational variances with review notes and tamper-evident event records.
- **MRL Compliance & Quality Testing**: Compares analytical laboratory sample data with target export market standards, highlighting safety margins and compliance statuses.
- **Quarantine & Risk Management**: Automates lot hold states to block compromised or untested batches from entering production or export pipelines.
- **Bilingual & Enterprise UX**: Supports English and Vietnamese (`i18next`), animated micro-interactions (`framer-motion`), and operational telemetry charts (`recharts`).

### 2. 📱 Mobile Field Application (`mobile/grainledger`)
- **Plot & Farmer Onboarding**: Captures farmer identities, agricultural land parcels, GPS boundary coordinates, and crop varieties directly in the field.
- **Field Spray Declarations**: Logs active chemical ingredients, dosage quantities, and mandatory pre-harvest withdrawal intervals (PHI).
- **Mobile Procurement Receipts**: Generates instant purchase receipts for freshly harvested grain, recording gross, tare, and net weights alongside quality metrics.
- **Offline-First Synchronization**: Functions autonomously without cellular connectivity; records are staged in an offline queue and synced when connectivity is restored.

---

## 🛠️ Technology Stack

| Domain | Web Operations Portal | Mobile Field Application |
| :--- | :--- | :--- |
| **Framework / Runtime** | React 19, TypeScript, Vite 8 | React Native 0.88, Expo SDK 58 |
| **Navigation & Routing** | React Router DOM v7 | Expo Router (File-based routing) |
| **State Management** | Zustand 5, TanStack React Query v5 | Zustand 5, React Native Worklets |
| **Styling & Design System** | Tailwind CSS 3.4, Phosphor Icons | React Native StyleSheet, Lucide Icons |
| **Form & Data Validation** | Zod, React Hook Form | Zod |
| **Precision Arithmetic** | Decimal.js (Arbitrary-precision mass) | Decimal.js |
| **Internationalization** | i18next & react-i18next (EN / VI) | Native multi-language support |
| **Data Visualization & Motion** | Recharts, Framer Motion | React Native Reanimated 4 |

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js**: Version `>= 20.x` (Node 20 LTS or Node 22 recommended).
- **Package Manager**: `npm`, `pnpm`, or `bun`.
- *(For Mobile)*: The **Expo Go** application installed on iOS/Android, or local emulators (Android Studio / Xcode).

---

### 1️⃣ Running the Web Portal

Navigate to the web application directory:

```bash
cd web/grainledger

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser at: `http://localhost:5173`

> [!NOTE]
> The Vite development server comes pre-configured with a reverse proxy in `vite.config.ts`:
> - All `/api/*` endpoints forward automatically to the backend server at `http://localhost:5080`.
> - If the backend server is offline, the client seamlessly falls back to local mock data to allow standalone UI testing and evaluation.

Available Web scripts:
```bash
npm run build      # Typecheck and bundle for production
npm run lint       # Run ESLint validation
npm run preview    # Locally preview production bundle
```

---

### 2️⃣ Running the Mobile Application

Navigate to the mobile application directory:

```bash
cd mobile/grainledger

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

From the interactive CLI prompt:
- Press `a` to launch in the **Android Emulator**.
- Press `i` to launch in the **iOS Simulator** (macOS required).
- Scan the printed QR code using the **Expo Go** app on a physical device.
- Press `w` to run a web-based mobile preview.

> [!TIP]
> Backend host address configuration:
> - **Android Emulator**: Uses `http://10.0.2.2:5080` by default (maps to host machine loopback).
> - **Physical Devices**: Set your development machine's local LAN IP (e.g., `http://192.168.1.50:5080`) in the server settings input on the mobile sign-in screen.

Available Mobile scripts:
```bash
npx expo lint       # Validate Expo and ESLint conventions
npx tsc --noEmit    # Run TypeScript static type analysis
```

---

## 🔒 Role-Based Access Control (RBAC)

GrainLedger enforces fine-grained authorization aligned with agricultural and milling roles:

| Role | Operational Scope |
| :--- | :--- |
| **Administrator** | Configures system balance policies, facility settings, partner organizations, and user permissions. |
| **MillOperator / Production** | Executes daily batch processing, logs transformation steps, and registers lot transfers between silos. |
| **WarehouseKeeper** | Manages intake scale receipts, monitors stock levels, and coordinates warehouse silo locations. |
| **QualityInspector / QA** | Records quality inspection metrics, registers lab samples, validates MRL compliance, and issues quarantine holds. |
| **Agronomist / FieldOfficer** | Oversees farmer cooperatives, tracks agricultural parcel profiles, and verifies pre-harvest chemical declarations. |
| **PurchasingStaff** | Issues raw grain purchase contracts, confirms intake pricing, and evaluates initial harvest grades. |

---

## 🤝 Contribution & Development Workflow

1. Create a descriptive feature branch from `frontend`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Adhere strictly to TypeScript types without suppressing lint warnings.
3. Validate your code locally prior to pushing:
   ```bash
   # In web/grainledger:
   npm run build
   npm run lint

   # In mobile/grainledger:
   npx tsc --noEmit
   ```
4. Structure commit messages following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(web): ...` / `feat(mobile): ...` (New features)
   - `fix(web): ...` / `fix(mobile): ...` (Bug fixes)
   - `refactor(...): ...` (Code refactoring)
   - `docs: ...` (Documentation changes)
5. Submit a Pull Request targeting the `frontend` or `dev` branch.

---

## 📄 License

This project is licensed under the **MIT License**. Refer to the `LICENSE` file for full terms.

---

*GrainLedger Capstone Project — Powered by Modern Web & Mobile Technologies.*
