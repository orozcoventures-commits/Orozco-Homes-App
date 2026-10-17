// Project stage (migration 055): where a project is in its life. Separate from
// a weekly update's On Track / Needs Attention / Delayed, which describes how
// an active job is going. Projects without a stage (before 055) count as Active.

export const STAGES = [
  { key: 'active',    label: 'Active',    color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', hint: 'Approved — work is happening' },
  { key: 'potential', label: 'Potential', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', hint: 'Not approved yet' },
  { key: 'on-hold',   label: 'On Hold',   color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', hint: 'Approved but paused' },
  { key: 'completed', label: 'Completed', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB', hint: 'Finished' },
];
export const STAGE_KEYS = STAGES.map((s) => s.key);
export const stageOf = (project) => (STAGE_KEYS.includes(project?.stage) ? project.stage : 'active');
export const stageInfo = (key) => STAGES.find((s) => s.key === key) ?? STAGES[0];

// [{ stage, projects }] in stage order, keeping each list's own order; empty groups left out.
export function groupByStage(projects) {
  return STAGES
    .map((stage) => ({ stage, projects: (projects ?? []).filter((p) => stageOf(p) === stage.key) }))
    .filter((g) => g.projects.length > 0);
}
