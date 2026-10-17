import { groupByStage } from '../utils/projectStages';

// <option>s for a project <select>, grouped Active → Potential → On Hold →
// Completed. Before migration 055 every project counts as Active, so the list
// looks as it did (one group, shown without a heading).
export default function ProjectOptions({ projects }) {
  const groups = groupByStage(projects);
  if (groups.length <= 1 && (groups[0]?.stage.key ?? 'active') === 'active') {
    return (projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>);
  }
  return groups.map(({ stage, projects: list }) => (
    <optgroup key={stage.key} label={stage.label}>
      {list.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
    </optgroup>
  ));
}
