import { ValidationStatus } from '../ventilation/VentilationValidationService';

/**
 * Categorization of engineering safety violations.
 */
export type SafetyFailureType =
  | 'NON_FINITE_NUMERIC'   // NaN, +Infinity, -Infinity
  | 'NEGATIVE_AIRFLOW'     // Airflow Q < 0
  | 'OVERSIZED_DUCT'       // Duct dimensions or aspect ratio exceed engineering safety limits
  | 'OUT_OF_BOUNDS'        // Parameter outside physical or code-prescribed operational bounds
  | 'CONTRADICTORY_INPUT'  // Physically contradictory engineering parameters
  | 'MISSING_PREREQUISITE' // Mandatory prerequisite evidence missing
  | 'PROVENANCE_VIOLATION' // Unverified or unapproved code source
  | 'GENERAL_SAFETY_FAIL'; // General safety failure

/**
 * Standardized record for engineering validation & safety failures.
 */
export interface SafetyFailureEntry {
  id: string;
  timestamp: string;
  system: string;
  failureType: SafetyFailureType;
  status: ValidationStatus;
  field?: string;
  value?: unknown;
  formattedValue?: string;
  expected?: string;
  message: string;
  reasons: string[];
  context?: Record<string, unknown>;
  stackTrace?: string;
}

export type SafetyFailureListener = (entry: SafetyFailureEntry) => void;

export interface LoggerConfig {
  /** Whether the logger captures and records failures in memory */
  enabled: boolean;
  /** Whether failures are written to browser console (console.error / console.warn) */
  consoleReporting: boolean;
  /** Maximum number of records retained in the circular buffer */
  maxHistorySize: number;
}

/**
 * Centralized logging utility to capture and format engineering validation results.
 * Guarantees that all safety-related failures (NaN, +Infinity, -Infinity, negative flows, oversized ducts)
 * are formatted and reported consistently in the browser console for debugging.
 */
export class EngineeringValidationLogger {
  private static config: LoggerConfig = {
    enabled: true,
    consoleReporting: true,
    maxHistorySize: 100
  };

  private static history: SafetyFailureEntry[] = [];
  private static listeners: Set<SafetyFailureListener> = new Set();
  private static idCounter = 0;

  /**
   * Configure logger behavior.
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset logger configuration to default settings.
   */
  static resetConfig(): void {
    this.config = {
      enabled: true,
      consoleReporting: true,
      maxHistorySize: 100
    };
  }

  /**
   * Formats a raw value into a descriptive string, giving special clarity to non-finite numbers.
   */
  static formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'NaN (typeof number)';
      if (value === Infinity) return '+Infinity (typeof number)';
      if (value === -Infinity) return '-Infinity (typeof number)';
      return String(value);
    }
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Checks whether a value is a valid finite engineering number.
   * If invalid (NaN, Infinity, -Infinity, non-number, null, undefined), automatically
   * logs the safety failure to the browser console and captures it.
   */
  static assertFinite(
    system: string,
    field: string,
    value: unknown,
    options?: {
      expected?: string;
      customMessage?: string;
      context?: Record<string, unknown>;
      mustBePositive?: boolean;
      mustBeNonNegative?: boolean;
    }
  ): boolean {
    const isNum = typeof value === 'number';
    const isFiniteNum = isNum && Number.isFinite(value);

    if (!isFiniteNum) {
      const formattedVal = this.formatValue(value);
      const isNaNVal = typeof value === 'number' && Number.isNaN(value);
      const isInfVal = value === Infinity || value === -Infinity;
      
      let specificReason = `Non-finite number detected: ${field} is ${formattedVal}.`;
      if (isNaNVal) {
        specificReason = `Non-finite safety violation: ${field} is NaN.`;
      } else if (isInfVal) {
        specificReason = `Non-finite safety violation: ${field} is ${value > 0 ? '+Infinity' : '-Infinity'}.`;
      }

      this.logNonFinite({
        system,
        field,
        value,
        expected: options?.expected || 'finite number (Number.isFinite)',
        message: options?.customMessage || specificReason,
        reasons: [specificReason],
        context: options?.context
      });
      return false;
    }

    // Optional sign check if specified
    if (options?.mustBePositive && (value as number) <= 0) {
      const reason = `Physical boundary violation: ${field} must be > 0, received ${value}.`;
      this.logSafetyFailure({
        system,
        field,
        value,
        failureType: 'OUT_OF_BOUNDS',
        status: 'FAIL',
        expected: '> 0',
        message: options.customMessage || reason,
        reasons: [reason],
        context: options.context
      });
      return false;
    }

    if (options?.mustBeNonNegative && (value as number) < 0) {
      const reason = `Physical boundary violation: ${field} must be >= 0, received ${value}.`;
      this.logSafetyFailure({
        system,
        field,
        value,
        failureType: 'OUT_OF_BOUNDS',
        status: 'FAIL',
        expected: '>= 0',
        message: options.customMessage || reason,
        reasons: [reason],
        context: options.context
      });
      return false;
    }

    return true;
  }

  /**
   * Dedicated helper to log non-finite numeric safety violations (NaN / Infinity).
   */
  static logNonFinite(params: {
    system: string;
    field: string;
    value: unknown;
    expected?: string;
    message?: string;
    reasons?: string[];
    context?: Record<string, unknown>;
  }): SafetyFailureEntry {
    const formattedVal = this.formatValue(params.value);
    const defaultMsg = `Non-finite numeric evidence rejected in ${params.system}: ${params.field} = ${formattedVal}`;
    const defaultReason = `Field "${params.field}" received non-finite numeric value: ${formattedVal}`;

    return this.logSafetyFailure({
      system: params.system,
      field: params.field,
      value: params.value,
      failureType: 'NON_FINITE_NUMERIC',
      status: 'FAIL',
      expected: params.expected || 'finite number',
      message: params.message || defaultMsg,
      reasons: params.reasons || [defaultReason],
      context: params.context
    });
  }

  /**
   * Captures and logs any engineering safety failure.
   */
  static logSafetyFailure(failure: {
    system: string;
    failureType: SafetyFailureType;
    status?: ValidationStatus;
    field?: string;
    value?: unknown;
    expected?: string;
    message: string;
    reasons?: string[];
    context?: Record<string, unknown>;
  }): SafetyFailureEntry {
    const entry: SafetyFailureEntry = {
      id: `safety-fail-${++this.idCounter}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: failure.system,
      failureType: failure.failureType,
      status: failure.status || 'FAIL',
      field: failure.field,
      value: failure.value,
      formattedValue: failure.value !== undefined ? this.formatValue(failure.value) : undefined,
      expected: failure.expected,
      message: failure.message,
      reasons: failure.reasons || [failure.message],
      context: failure.context
    };

    if (this.config.enabled) {
      this.history.push(entry);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    // Report to browser console
    if (this.config.consoleReporting) {
      this.reportToConsole(entry);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('[EngineeringValidationLogger] Listener error:', err);
      }
    }

    return entry;
  }

  /**
   * Helper to capture a general validation result (e.g. from EzSelectionService or Ashrae621ZoneService)
   * and log it if it contains any failure or safety issue.
   */
  static captureValidationResult(
    system: string,
    result: { valid: boolean; status: ValidationStatus; reasons: string[] },
    context?: Record<string, unknown>
  ): void {
    if (result.status === 'FAIL' || result.status === 'BLOCKED') {
      const isNonFinite = result.reasons.some(r => 
        r.toLowerCase().includes('nan') || 
        r.toLowerCase().includes('infinity') || 
        r.toLowerCase().includes('finite')
      );

      this.logSafetyFailure({
        system,
        failureType: isNonFinite ? 'NON_FINITE_NUMERIC' : 'GENERAL_SAFETY_FAIL',
        status: result.status,
        message: result.reasons[0] || `Validation failed in ${system}`,
        reasons: result.reasons,
        context
      });
    }
  }

  /**
   * Reports the safety failure entry to browser console with high-visibility formatting.
   */
  private static reportToConsole(entry: SafetyFailureEntry): void {
    const tag = `[ENGINEERING SAFETY FAILURE: ${entry.failureType}]`;
    const header = `${tag} [${entry.system}] ${entry.field ? `Field: "${entry.field}" - ` : ''}${entry.message}`;

    const details: Record<string, unknown> = {
      'System': entry.system,
      'Failure Type': entry.failureType,
      'Status': entry.status,
      'Timestamp': entry.timestamp
    };

    if (entry.field !== undefined) details['Field'] = entry.field;
    if (entry.formattedValue !== undefined) details['Received Value'] = entry.formattedValue;
    if (entry.expected !== undefined) details['Expected'] = entry.expected;
    if (entry.reasons.length > 0) details['Reasons'] = entry.reasons;
    if (entry.context && Object.keys(entry.context).length > 0) details['Context'] = entry.context;

    // Use grouped console reporting in browser environments for readable structure
    if (typeof console.groupCollapsed === 'function') {
      console.groupCollapsed(
        `%c${tag}%c [${entry.system}] ${entry.message}`,
        'background: #7f1d1d; color: #fecaca; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        'color: #ef4444; font-weight: bold;'
      );
      console.error(header);
      if (typeof console.table === 'function' && Object.keys(details).length <= 10) {
        console.table(details);
      } else {
        console.error('Details:', details);
      }
      console.groupEnd();
    } else {
      console.error(header, details);
    }
  }

  /**
   * Retrieves all captured safety failure entries.
   */
  static getHistory(): ReadonlyArray<SafetyFailureEntry> {
    return [...this.history];
  }

  /**
   * Retrieves the most recent failure entry, or null if none recorded.
   */
  static getLatestFailure(): SafetyFailureEntry | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Clears the in-memory failure history.
   */
  static clearHistory(): void {
    this.history = [];
  }

  /**
   * Subscribes a listener to receive real-time failure entries.
   * Returns an unsubscribe function.
   */
  static subscribe(listener: SafetyFailureListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
