package main

import (
	"context"

	"github.com/multica-ai/multica/server/internal/realtime"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

// dbScopeAuthorizer implements realtime.ScopeAuthorizer for the per-task and
// per-chat scopes (workspace/user scopes are validated by the hub itself
// against the connection identity). It returns true only when the requested
// resource exists and belongs to the caller's workspace, preventing
// cross-workspace snooping via guessed/leaked task or chat IDs.
type dbScopeAuthorizer struct{ q *db.Queries }

func newScopeAuthorizer(q *db.Queries) *dbScopeAuthorizer { return &dbScopeAuthorizer{q: q} }

func (a *dbScopeAuthorizer) AuthorizeScope(ctx context.Context, _, workspaceID, scopeType, scopeID string) (bool, error) {
	if workspaceID == "" || scopeID == "" {
		return false, nil
	}
	wsUUID := parseUUID(workspaceID)
	idUUID := parseUUID(scopeID)
	if !wsUUID.Valid || !idUUID.Valid {
		return false, nil
	}
	switch scopeType {
	case realtime.ScopeTask:
		task, err := a.q.GetAgentTask(ctx, idUUID)
		if err != nil {
			return false, nil
		}
		issue, err := a.q.GetIssue(ctx, task.IssueID)
		if err != nil {
			return false, nil
		}
		return issue.WorkspaceID == wsUUID, nil
	case realtime.ScopeChat:
		sess, err := a.q.GetChatSession(ctx, idUUID)
		if err != nil {
			return false, nil
		}
		return sess.WorkspaceID == wsUUID, nil
	default:
		return false, nil
	}
}
