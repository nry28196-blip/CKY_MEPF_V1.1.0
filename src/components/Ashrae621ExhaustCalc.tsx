import { useState, useMemo, useEffect } from 'react';
import { useUnit } from '../lib/UnitContext';
import { StandardDataProvider } from '../data/ventilation/StandardDataProvider';
import { Ashrae621ExhaustService, ExhaustOperationMode } from '../calculations/ventilation/Ashrae621ExhaustService';
import { VentilationValidationService } from '../calculations/ventilation/VentilationValidationService';
import TooltipLabel from './TooltipLabel';
import EngineeringStatusHeader, { EngineeringStatus } from './common/EngineeringStatusHeader';
import { Wind, Plus, Trash2, Info, AlertTriangle, ShieldAlert, Layers, FileSpreadsheet } from 'lucide-react';
import { exportExhaustToCsv } from '../lib/exportCsv';

interface ExhaustRow {
  id: string;
  name: string;
  categoryId: string;
  quantity: number | '';
  designExhaust: number | '';
  operationMode?: ExhaustOperationMode;
  parkingGarageOpenSides50PercentOrMore?: boolean;
}

interface Ashrae621ExhaustCalcProps {
  edition?: string;
  onStatusChange?: (status: EngineeringStatus) => void;
}

export default function Ashrae621ExhaustCalc({ edition = '2022', onStatusChange }: Ashrae621ExhaustCalcProps) {
  const { unitSystem } = useUnit();
  const exhaustRates = StandardDataProvider.get621ExhaustRates(edition);
  const isMetric = unitSystem === 'metric';

  const [complianceProcedure, setComplianceProcedure] = useState<'prescriptive' | 'performance'>('prescriptive');
  const [rows, setRows] = useState<ExhaustRow[]>([
    {
      id: '1',
      name: 'Public Restroom 1',
      categoryId: 'toilet_public',
      quantity: 2,
      designExhaust: isMetric ? 50 : 100,
      operationMode: 'continuous'
    }
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Math.random().toString(),
        name: `Space ${rows.length + 1}`,
        categoryId: 'toilet_public',
        quantity: 1,
        designExhaust: isMetric ? 25 : 50,
        operationMode: 'continuous'
      }
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof ExhaustRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const results = useMemo(() => {
    const calcRows = rows.map(r => {
      const exhaustType = exhaustRates.find(e => e.id === r.categoryId) || null;
      const qty = r.quantity === '' ? null : Number(r.quantity);
      const dExhaust = r.designExhaust === '' ? null : Number(r.designExhaust);

      const res = Ashrae621ExhaustService.calculate({
        expectedStandard: 'ASHRAE 62.1',
        expectedEdition: edition,
        exhaustType,
        qty,
        designExhaust: dExhaust,
        operationMode: r.operationMode || 'continuous',
        unitSystem: isMetric ? 'metric' : 'ip',
        parkingGarageOpenSides50PercentOrMore: r.parkingGarageOpenSides50PercentOrMore,
        calculationProcedure: complianceProcedure
      });

      return { row: r, result: res, exhaustType };
    });

    const status = VentilationValidationService.aggregateStatus(calcRows.map(r => r.result.status));

    return { calcRows, status };
  }, [rows, isMetric, exhaustRates, edition, complianceProcedure]);

  const headerStatus: EngineeringStatus =
    complianceProcedure === 'performance' ? 'BLOCKED' :
    results.status === 'PASS' ? 'PASS' :
    results.status === 'FAIL' ? 'FAIL' :
    results.status === 'BLOCKED' ? 'BLOCKED' :
    results.status === 'INCOMPLETE' ? 'INCOMPLETE' :
    results.status === 'NOT_VERIFIED' ? 'NOT_VERIFIED' : 'NOT_READY_FOR_ENGINEERING_USE';

  useEffect(() => {
    onStatusChange?.(headerStatus);
  }, [headerStatus, onStatusChange]);

  const headerMessage = complianceProcedure === 'performance'
    ? 'ASHRAE 62.1 Section 6.5.2 Performance Compliance Path (Status: PERFORMANCE_PATH_UNIMPLEMENTED) - Independent evaluation required'
    : `ASHRAE 62.1-${edition} Prescriptive Exhaust (Section 6.5.1, Table 6-2) - ${results.status === 'PASS' ? 'All exhaust requirements met' : 'Check prescriptive requirements'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          Basis: ANSI/ASHRAE Standard 62.1-2022 + Addendum x (Section 6.5.1 Prescriptive)
        </div>

        {/* Explicit Compliance Path Switcher */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 px-2 font-medium">Compliance Path:</span>
          <button
            type="button"
            id="path-prescriptive-btn"
            onClick={() => setComplianceProcedure('prescriptive')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              complianceProcedure === 'prescriptive'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Prescriptive (6.5.1)
          </button>
          <button
            type="button"
            id="path-performance-btn"
            onClick={() => setComplianceProcedure('performance')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              complianceProcedure === 'performance'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Performance (6.5.2)
          </button>
        </div>
      </div>

      <EngineeringStatusHeader
        status={headerStatus}
        message={headerMessage}
      />

      {/* Explicit Performance Path Unimplemented Warning Banner */}
      {complianceProcedure === 'performance' && (
        <div className="bg-rose-950/40 border border-rose-800/70 p-4 rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Section 6.5.2 Performance Compliance Path — PERFORMANCE_PATH_UNIMPLEMENTED</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            The calculation engine does not generate fabricated performance calculations or fall back silently to Table 6-2.
            Section 6.5.2 requires an independent engineering evaluation including contaminant source quantification, dispersion modeling, and documented compliance with allowable concentration limits.
          </p>
        </div>
      )}

      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-rose-400">
            <Wind className="w-5 h-5" />
            <h3 className="font-semibold text-white">Prescriptive Space Exhaust Rates</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="export-exhaust-csv-btn"
              onClick={() => {
                exportExhaustToCsv({
                  isMetric,
                  complianceProcedure,
                  overallStatus: results.status,
                  rows: results.calcRows.map(({ row, result, exhaustType }) => ({
                    name: row.name,
                    categoryName: exhaustType?.name || row.categoryId,
                    quantity: row.quantity ?? 0,
                    unitType: result.unitType === 'm2' ? (isMetric ? 'm²' : 'ft²') : result.unitType,
                    requiredExhaust: result.requiredExhaust ?? 'N/A',
                    designExhaust: row.designExhaust ?? 0,
                    status: result.status,
                    airClass: result.airClass ?? 1,
                    operationMode: row.operationMode || 'continuous'
                  }))
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-sm border border-slate-700 transition-colors cursor-pointer"
              title="Export current exhaust calculation to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>Export CSV</span>
            </button>
            <button
              id="add-exhaust-space-btn"
              onClick={addRow}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Space
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {results.calcRows.map(({ row, result, exhaustType }) => {
            const allowsIntermittent = exhaustType?.intermittentRate !== null && exhaustType?.intermittentRate !== undefined;
            const isParkingGarage = exhaustType?.id === 'parking_garages' || exhaustType?.id === 'parking_garage';

            return (
              <div
                key={row.id}
                id={`exhaust-row-${row.id}`}
                className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 relative space-y-3"
              >
                {rows.length > 1 && (
                  <button
                    id={`remove-exhaust-row-${row.id}`}
                    onClick={() => removeRow(row.id)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                    title="Remove space"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 md:span-3 md:col-span-3">
                    <TooltipLabel label="Space Name" tooltip="Identifier" />
                    <input
                      id={`exhaust-space-name-${row.id}`}
                      type="text"
                      className="w-full bg-slate-900 text-white rounded px-3 py-2 text-sm border border-slate-700"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    />
                  </div>

                  <div className="col-span-12 md:span-3 md:col-span-3">
                    <TooltipLabel label="Table 6-2 Space Category" tooltip="ASHRAE 62.1-2022 Table 6-2 Space Type" />
                    <select
                      id={`exhaust-category-${row.id}`}
                      className="w-full bg-slate-900 text-white rounded px-3 py-2 text-sm border border-slate-700"
                      value={row.categoryId}
                      onChange={(e) => updateRow(row.id, 'categoryId', e.target.value)}
                    >
                      {exhaustRates.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 md:span-2 md:col-span-2">
                    <TooltipLabel
                      label={`Qty (${result.unitType === 'm2' ? (isMetric ? 'm²' : 'ft²') : result.unitType})`}
                      tooltip="Multiplier for prescriptive exhaust requirement"
                    />
                    <input
                      id={`exhaust-qty-${row.id}`}
                      type="number"
                      min="0"
                      className="w-full bg-slate-900 text-white rounded px-3 py-2 text-sm border border-slate-700"
                      value={row.quantity ?? ''}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>

                  <div className="col-span-6 md:span-2 md:col-span-2">
                    <TooltipLabel
                      label={`Design (${isMetric ? 'L/s' : 'cfm'})`}
                      tooltip="Proposed actual engineering exhaust airflow"
                    />
                    <input
                      id={`exhaust-design-${row.id}`}
                      type="number"
                      min="0"
                      className="w-full bg-slate-900 text-white rounded px-3 py-2 text-sm border border-slate-700"
                      value={row.designExhaust ?? ''}
                      onChange={(e) => updateRow(row.id, 'designExhaust', e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>

                  <div className="col-span-12 md:span-2 md:col-span-2 flex flex-col justify-center">
                    <div className="text-[10px] text-slate-400 mb-1">
                      Min: {result.requiredExhaust === null 
                        ? (result.isSpecialStandard ? 'Special Std' : 'N/A') 
                        : `${result.requiredExhaust.toFixed(1)} ${isMetric ? 'L/s' : 'cfm'}`}
                    </div>
                    <div
                      id={`exhaust-status-${row.id}`}
                      className={`px-2 py-1 rounded text-xs font-bold text-center ${
                        result.isSpecialStandard
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : result.status === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : result.status === 'FAIL'
                          ? 'bg-red-500/20 text-red-400'
                          : result.status === 'BLOCKED'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {result.isSpecialStandard ? 'SPECIAL REQUIREMENT' : result.status}
                    </div>
                  </div>
                </div>

                {/* Parking Garage Exception 1 Toggle */}
                {isParkingGarage && (
                  <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded border border-slate-800 text-xs text-slate-300">
                    <input
                      id={`exhaust-pg-open-sides-${row.id}`}
                      type="checkbox"
                      checked={Boolean(row.parkingGarageOpenSides50PercentOrMore)}
                      onChange={(e) => updateRow(row.id, 'parkingGarageOpenSides50PercentOrMore', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                    />
                    <label htmlFor={`exhaust-pg-open-sides-${row.id}`} className="cursor-pointer">
                      <strong>Section 6.5.1 Exception 1:</strong> Naturally ventilated parking garage (two or more sides having ≥50% open wall area). Mechanical exhaust exempt.
                    </label>
                  </div>
                )}

                {/* Sub-bar: Operation Mode & Prescriptive Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Operation Mode:</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`mode-${row.id}`}
                        value="continuous"
                        checked={(row.operationMode || 'continuous') === 'continuous'}
                        onChange={() => updateRow(row.id, 'operationMode', 'continuous')}
                        className="text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span>Continuous</span>
                    </label>

                    {allowsIntermittent && (
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`mode-${row.id}`}
                          value="intermittent"
                          checked={row.operationMode === 'intermittent'}
                          onChange={() => updateRow(row.id, 'operationMode', 'intermittent')}
                          className="text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                        <span>Intermittent</span>
                      </label>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 text-[10px] font-mono">
                      {result.compliancePath === 'PERFORMANCE'
                        ? 'Path: 6.5.2 Performance'
                        : `Rate: ${result.rateStatus}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      Air Class {result.airClass ?? 'N/A'}
                    </span>
                    {result.isSpecialStandard && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                        Governed by {result.specialStandardReference}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recirculation note & compliance notes */}
                {result.recirculationClassification && (
                  <div className="text-[11px] text-slate-400 flex items-start gap-1.5 bg-slate-900/40 p-2 rounded">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{result.recirculationClassification}</span>
                  </div>
                )}

                {/* Special standard blocked notice */}
                {result.isSpecialStandard && (
                  <div className="text-[11px] text-amber-300 flex items-start gap-1.5 bg-amber-950/20 border border-amber-800/40 p-2 rounded">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>SPECIAL REQUIREMENT (Status: BLOCKED):</strong> Table 6-2 does not prescribe a numeric exhaust rate. Design exhaust must be engineered and verified per <em>{result.specialStandardReference}</em>.
                    </div>
                  </div>
                )}

                {result.complianceNotes.length > 0 && result.status === 'FAIL' && (
                  <div className="text-[11px] text-rose-400 flex items-start gap-1.5 bg-rose-950/30 border border-rose-900/50 p-2 rounded">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {result.complianceNotes.map((note, idx) => (
                        <div key={idx}>{note}</div>
                      ))}
                    </div>
                  </div>
                )}

                {result.parkingGarageOpenSides50PercentOrMore && (
                  <div className="text-[11px] text-emerald-400 flex items-start gap-1.5 bg-emerald-950/20 border border-emerald-800/40 p-2 rounded">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>Naturally ventilated parking garage: minimum mechanical exhaust rate is 0 under Section 6.5.1 Exception 1.</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ASHRAE 62.1-2022 Table 6-3 Airstreams or Sources Reference */}
      {edition === '2022' && (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Layers className="w-5 h-5" />
              <h3 className="font-semibold text-white">Airstreams or Sources — Air Classification (Table 6-3)</h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              Air Class Layer Only • No Prescriptive Numeric Airflow Rates
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Per ASHRAE 62.1-2022 Section 6.5.1 and Addendum x, design exhaust airflow is determined in accordance with Tables 6-2 and 6-3. Table 6-3 designates mandatory Air Class classifications for specialized airstreams and hood discharges. Table 6-3 prescribes <strong className="text-slate-200">no numeric exhaust airflow rates</strong>; required exhaust airflows must be engineered in accordance with the referenced governing standards. Source names and Air Classes are standard-derived; additional scope notes represent supplementary engineering guidance.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Airstream or Source (Standard-Derived)</th>
                  <th className="py-2.5 px-3">Required Air Class (Table 6-3)</th>
                  <th className="py-2.5 px-3">Governing Standard / Supplementary Guidance</th>
                  <th className="py-2.5 px-3">Recirculation Limitations</th>
                  <th className="py-2.5 px-3 text-right">Prescriptive Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {StandardDataProvider.getProduction621Table63Sources().map(src => {
                  const airClassBadge =
                    src.airClass === 4 ? 'bg-red-950/60 text-red-300 border-red-800/60' :
                    src.airClass === 3 ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' :
                    'bg-yellow-950/60 text-yellow-300 border-yellow-800/60';

                  const recirculationNote =
                    src.airClass === 4 ? 'Prohibited (100% direct outdoor exhaust)' :
                    src.airClass === 3 ? 'Permitted only within originating space' :
                    'Permitted to other Class 2/3 spaces; prohibited to Class 1';

                  return (
                    <tr key={src.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200">
                        {src.name}
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          <span className="text-slate-500 font-medium">Supplementary Guidance:</span> {src.description}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${airClassBadge}`}>
                          Class {src.airClass}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        {src.specialStandardReference || 'Project EHS / Standard'}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans">
                        {recirculationNote}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        <span className="text-amber-400 font-medium">N/A</span> (Governing Std)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
