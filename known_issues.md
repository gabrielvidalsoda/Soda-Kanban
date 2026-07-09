# Known issues

Verified bugs and production limitations in SODA KANBAN. Planned fixes are tracked in [todos.md](todos.md).

| Issue | Impact | Notes |
|-------|--------|-------|
| Email invites may fail silently if Resend is misconfigured | Invite API returns success even if email fails | `send_email()` in `backend/app/services/email.py` logs errors; set `RESEND_API_KEY` and verify `FROM_EMAIL` |
| "Add list" button is non-functional | Users cannot create columns from the board | `frontend/src/components/KanbanBoard.tsx` — button with no handler |
| No archive support | Users can only hard-delete (where API exists) or keep items forever | No `archived` fields or archive routes |
| Browser extension console noise | Misleading errors in DevTools | `FrameDoesNotExistError` / message-port errors from extensions, not the app |

## Fixed in Supabase + Railway migration

- Avatar storage is now in Supabase Storage (persists across deploys)
- Other users' avatars display via `GET /users/{user_id}/avatar`
