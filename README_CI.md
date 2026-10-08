# ASHRAE 62.1-2022 Validation & CI Strategy

## 1. Production Standard & Calculation Basis

The active production calculation baseline for commercial ventilation is strictly defined as:

* **Main Ventilation Procedure**: `ANSI/ASHRAE Standard 62.1-2022 + Addendum j` (incorporating local air-density correction factor $E_\rho$).
* **Prescriptive Exhaust Airflow**: `ANSI/ASHRAE Standard 62.1-2022 + Addendum x` (Tables 6-2 and 6-3 classification).
* **Controlled Scope**: No other 2022 addenda, experimental provisions, or future editions are activated for production use.
* **Standard Representation**: Programmatic constant `ASHRAE_62_1_PRODUCTION_BASIS` in `src/data/ventilation/ashrae621/types.ts` and accessor `StandardDataProvider.getProductionBasis()` serve as the single source of truth for the active compliance basis.

---

## 2. Standard Edition & Scope Isolation

Calculations enforce multi-layered defense-in-depth boundaries to prevent unapproved standards or experimental data from executing in production:

### Active Baseline (2022)
* Space types (Table 6-1), Air Distribution Effectiveness ($E_z$, Table 6-4), Minimum Exhaust Rates (Table 6-2), and Specialized Exhaust Sources (Table 6-3) are verified against the published ASHRAE 62.1-2022 standard and applicable addenda (j and x).

### Archived Edition (2019)
* ASHRAE 62.1-2019 dataset status is designated as `SUBSET`.
* Direct engine requests and service invocations referencing edition 2019 return `status: 'BLOCKED'` and `revisionState: 'ARCHIVED_2019_NON_PRODUCTION'`, setting outputs (`voz`, `vot`, `vou`, `ev`) to `null`.

### Deferred Edition (2025)
* ASHRAE 62.1-2025 dataset status is designated as `NOT_VERIFIED`.
* Direct engine requests and service invocations referencing edition 2025 return `status: 'BLOCKED'` and `revisionState: 'DEFERRED_FUTURE_EDITION_NON_PRODUCTION'`.
* Fabricated metadata (such as passing synthetic `verificationStatus: 'VERIFIED'`) is strictly rejected by service entry gates.

### Out-of-Scope Standards (ASHRAE 62.2)
* Residential ventilation under ASHRAE 62.2 is out-of-scope for the commercial 62.1 ventilation engine. Requests specifying 62.2 are intercepted at the calculation entry point and blocked with `status: 'BLOCKED'`.

---

## 3. Engineering Invariants & Isolation Controls

### Unidirectional Flow Isolation
* The unidirectional air distribution configuration (`ez-unidirectional-flow`, nominal $E_z = 0.5$) in Table 6-4 is marked as `NOT_VERIFIED`.
* It is excluded from verified Table 6-4 lookups.
* Selection by distribution criteria or direct ID resolution yields `status: 'BLOCKED'` with `ez: null`.
* Direct calculation in `Ashrae621ZoneService` yields `status: 'BLOCKED'` with `voz: null`.

### Manual $E_z$ Overrides
* User-specified custom $E_z$ values are tagged with provenance state `USER_OVERRIDE` and flagged for required code-official approval.

### Specialized Exhaust Sources (Table 6-3)
* Table 6-3 sources provide standard-derived Air Class designations (Air Classes 1 through 4) and governing standard cross-references (e.g., ANSI/ASHRAE Standard 154, NFPA 96, ACGIH).
* Table 6-3 prescribes **no numeric airflow rates**; numeric calculations require engineering per the referenced standard and are prevented from executing blind prescriptive sums.

### Air-Density Correction Verification ($E_\rho$)
* **Exact Temperature Simplification Boundary**: $C_T = 1.0$ is permitted strictly when design temperature $T < 40.0^\circ\text{C}$. For $T \ge 40.0^\circ\text{C}$, the full equation $(T + 273.15) / 294.15$ is enforced.
* **Exact Humidity Simplification Boundary**: $C_W = 1.0$ is permitted strictly when design humidity ratio $W < 0.024\text{ kg/kg}$. For $W \ge 0.024\text{ kg/kg}$, the full equation $(1 + W) / (1 + 1.6078 W)$ is enforced.
* **Moisture Input Integrity**:
  * Authoritative explicit `humidityRatio` controls analytical density calculations and overrides conflicting relative humidity.
  * Relative humidity derives psychrometrically consistent humidity ratio and dry air density when explicit $W$ is omitted.
  * Normative Appendix D analytical calculation with missing moisture inputs returns `status: 'INCOMPLETE'`, preventing unverified results.
* **Analytical Equations**: Supports explicit selection between Eq D-4 ($E_\rho = C_z \times C_T \times C_W$) and Section D2.3 ($E_\rho = 1.2 / \rho$).
* **Table 6-5 Elevation Lookup**: Preserved for all supported elevations ($\le 3437\text{ m}$); elevations $> 3437\text{ m}$ record normative fallback to Appendix D.
* **Zone Airflow Scaling**: $E_\rho$ propagates from `DensityCorrectionService` to `Ashrae621ZoneService` according to:
  $$V_{oz} = \left(\frac{V_{bz}}{E_z}\right) \times E_\rho$$

---

## 4. Verification Suite & Quality Gates

Every local build and PR validation requires passing the automated validation suite:

1. **Unit & Mathematical Regression Tests**:
   ```bash
   npm test
   ```
   * Runs all 25 test suites (509 tests across zone calculations, multi-zone simplified/alternative procedures, exhaust calculations, provenance validation, density correction, and isolation boundaries).
2. **Type Safety & Static Linting**:
   ```bash
   npm run lint
   ```
   * Enforces zero TypeScript compiler errors (`tsc --noEmit`).
3. **Application Build**:
   ```bash
   npm run build
   ```
   * Validates production Vite bundling without asset or module resolution failures.

---

## 5. CI / GitHub Actions Status

* **Status**: **GitHub Actions integration is pending.**
* **Current Verification State**: No GitHub Actions run was available for verification. All verification gates and test suites are currently executed and verified in the controlled local/containerized environment.
