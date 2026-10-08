export type ValidationSeverity = 'info' | 'warning' | 'error';

export interface ValidationIssue {
  id: string;
  field?: string;
  severity: ValidationSeverity;
  message: string;
  reference?: string;
  title?: string;
}

export interface ValidationRule<T> {
  id: string;
  field?: keyof T | string;
  severity: ValidationSeverity;
  validate: (state: T) => boolean;
  message: string | ((state: T) => string);
  reference?: string;
  title?: string;
}

export class ValidationService {
  static validate<T>(state: T, rules: ValidationRule<T>[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const rule of rules) {
      try {
        if (!rule.validate(state)) {
          issues.push({
            id: rule.id,
            field: rule.field as string | undefined,
            severity: rule.severity,
            title: rule.title,
            message: typeof rule.message === 'function' ? rule.message(state) : rule.message,
            reference: rule.reference
          });
        }
      } catch (e) {
        issues.push({
          id: "sys_err_" + rule.id,
          severity: 'error',
          title: 'Validation Execution Error',
          message: "Rule " + rule.id + " failed to execute."
        });
      }
    }
    const severityOrder = { error: 0, warning: 1, info: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return issues;
  }
}
