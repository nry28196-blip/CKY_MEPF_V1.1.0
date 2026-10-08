# Validation Matrix

| Requirement | Implemented? | Tested? | Standard | Edition | Reference | Limitations |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **Zone Vbz Calculation** (Rp*Pz + Ra*Az) | YES | YES | ASHRAE 62.1 | 2022 | Sec 6.2.2.1 | None |
| **Zone Voz Calculation**: Voz = (Vbz / Ez) × Eρ | YES | YES | ASHRAE 62.1 | 2022 | Addendum j, Equation 6-2 | Ez must be supplied by user |
| **System Vot (Multi-zone)** | YES | YES | ASHRAE 62.1 | 2022 | Sec 6.2.5 | Vpz-min handled explicitly |
| **System Population Diversity** | YES | YES | ASHRAE 62.1 | 2022 | Sec 6.2.5.1 | Auto-defaults to ΣPz if not provided |
| **Air Density Correction** | YES | YES | ASHRAE 62.1 | 2022 | Addendum j | E_rho based on Addendum j Table 6-5 & Normative Appendix D |
| **Air Balance Net Flow** | NOT_READY_FOR_ENGINEERING_USE | NO | ASHRAE 62.1 | 2022 | App B | ACH reporting provided |
| **Fan Duty & Affinity Laws** | YES | YES | Engineering | N/A | Fundamentals | Assumes RPM^2.5 exponent for VFD |
| **Whole-Dwelling (62.2)** | YES | YES | ASHRAE 62.2 | 2022 | Sec 4.1.1 | Eq. 4.1.1 exact implementation |
| **Kitchen Hood (62.2)** | YES | YES | ASHRAE 62.2 | 2022 | Sec 5 | Covers continuous & intermittent |
| **Local Exhaust (62.1)** | YES | YES | ASHRAE 62.1 | 2022 | Table 6.5 | Basic coverage |
