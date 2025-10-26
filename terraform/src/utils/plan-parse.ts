export interface TerraformPlanSummaryActionCounts {
  create: number;
  update: number;
  delete: number;
  replace: number;
}
export interface TerraformPlanChangeEntry {
  address: string;
  actions: string[];
  type?: string;
}
export interface TerraformPlanSummary {
  project?: string;
  environment?: string;
  actions: TerraformPlanSummaryActionCounts;
  changes: TerraformPlanChangeEntry[];
  sensitiveOutputs: string[];
  drift?: boolean;
}

interface RawPlan {
  resource_changes?: Array<{
    address: string;
    type?: string;
    change?: { actions?: string[] };
  }>;
  planned_values?: { outputs?: Record<string, { sensitive?: boolean }> };
}

export function summarizePlan(planJson: unknown): TerraformPlanSummary {
  const obj = (planJson as RawPlan) || {};
  const resourceChanges = Array.isArray(obj.resource_changes)
    ? obj.resource_changes
    : [];
  const actions: TerraformPlanSummaryActionCounts = {
    create: 0,
    update: 0,
    delete: 0,
    replace: 0,
  };
  const changes: TerraformPlanChangeEntry[] = [];
  for (const rc of resourceChanges) {
    const acts: string[] = rc.change?.actions || [];
    if (acts.includes('create') && acts.includes('delete'))
      actions.replace += 1;
    else if (acts.includes('create')) actions.create += 1;
    else if (acts.includes('delete')) actions.delete += 1;
    else if (acts.includes('update')) actions.update += 1;
    changes.push({ address: rc.address, actions: acts, type: rc.type });
  }
  const outputs = obj.planned_values?.outputs || {};
  const sensitiveOutputs: string[] = Object.entries(outputs)
    .filter(([, v]) => v?.sensitive)
    .map(([k]) => k);
  return { actions, changes, sensitiveOutputs, drift: false };
}
