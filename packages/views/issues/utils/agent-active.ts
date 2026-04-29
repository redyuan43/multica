import type { Agent, Issue } from "@multica/core/types";

export function isIssueAgentActive(issue: Issue, agents: Agent[] = []): boolean {
  if (issue.assignee_type !== "agent" || !issue.assignee_id) return false;
  if (issue.status === "in_progress") return true;

  const agent = agents.find((a) => a.id === issue.assignee_id);
  return agent?.status === "working";
}
