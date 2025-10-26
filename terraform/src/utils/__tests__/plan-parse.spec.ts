import { summarizePlan } from '../../utils/plan-parse';

const samplePlan = {
  resource_changes: [
    {
      address: 'aws_instance.node[0]',
      type: 'aws_instance',
      change: { actions: ['create'] },
    },
    {
      address: 'aws_security_group.sg',
      type: 'aws_security_group',
      change: { actions: ['update'] },
    },
    {
      address: 'aws_eip.ip',
      type: 'aws_eip',
      change: { actions: ['delete', 'create'] },
    },
  ],
  planned_values: {
    outputs: {
      kubeconfig: { sensitive: true },
      cluster_name: { sensitive: false },
    },
  },
};

describe('summarizePlan', () => {
  it('produces correct action counts and sensitive outputs', () => {
    const summary = summarizePlan(samplePlan);
    expect(summary.actions.create).toBe(1);
    expect(summary.actions.update).toBe(1);
    expect(summary.actions.replace).toBe(1); // delete+create => replace
    expect(summary.actions.delete).toBe(0); // delete counted as replace in our logic
    expect(summary.sensitiveOutputs).toEqual(['kubeconfig']);
    expect(summary.changes.length).toBe(3);
  });
});
