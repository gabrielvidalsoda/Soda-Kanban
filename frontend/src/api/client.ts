import axios from "axios";
import type {
  Attachment,
  Board,
  BoardDetail,
  Card,
  CardImportResult,
  Comment,
  Invitation,
  NotificationPreference,
  PresignedUploadResponse,
  User,
  Workspace,
  WorkspaceMember,
} from "../types";
import { getAccessToken } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  completeRegistration: (payload: { name: string; invite_token?: string }) =>
    api.post<User>("/auth/complete-registration", payload).then((r) => r.data),
};

export const userApi = {
  me: () => api.get<User>("/users/me"),
  updateMe: (payload: { name?: string; phone?: string | null }) =>
    api.patch<User>("/users/me", payload).then((r) => r.data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<User>("/users/me/avatar", formData, {
      headers: { "Content-Type": undefined },
    }).then((r) => r.data);
  },
  fetchAvatar: (userId?: string) =>
    api.get<Blob>(userId ? `/users/${userId}/avatar` : "/users/me/avatar", {
      responseType: "blob",
    }).then((r) => r.data),
  getNotificationPreferences: () =>
    api.get<NotificationPreference[]>("/users/me/notification-preferences"),
  updateNotificationPreferences: (preferences: NotificationPreference[]) =>
    api.patch<NotificationPreference[]>("/users/me/notification-preferences", { preferences }),
};

export const workspaceApi = {
  list: () => api.get<Workspace[]>("/workspaces"),
  create: (name: string) => api.post<Workspace>("/workspaces", { name }),
  delete: (workspaceId: string) => api.delete(`/workspaces/${workspaceId}`),
  boards: (workspaceId: string) => api.get<Board[]>(`/workspaces/${workspaceId}/boards`),
  createBoard: (workspaceId: string, name: string, visibility = "team") =>
    api.post<Board>(`/workspaces/${workspaceId}/boards`, { name, visibility }),
  members: (workspaceId: string) =>
    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  updateMember: (workspaceId: string, memberId: string, role: "admin" | "member") =>
    api.patch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, { role }),
  removeMember: (workspaceId: string, memberId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
  createInvitation: (workspaceId: string, email?: string, boardId?: string) =>
    api.post<Invitation>(`/workspaces/${workspaceId}/invitations`, { email, board_id: boardId }),
  listInvitations: (workspaceId: string) =>
    api.get<Invitation[]>(`/workspaces/${workspaceId}/invitations`),
  revokeInvitation: (workspaceId: string, invitationId: string) =>
    api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`),
};

export const boardApi = {
  detail: (boardId: string) => api.get<BoardDetail>(`/boards/${boardId}/detail`),
  update: (boardId: string, payload: Partial<Board>) => api.patch<Board>(`/boards/${boardId}`, payload),
  deleteBoard: (boardId: string) => api.delete(`/boards/${boardId}`),
  createCard: (listId: string, payload: Partial<Card> & { title: string }) =>
    api.post<Card>(`/lists/${listId}/cards`, payload),
  updateCard: (cardId: string, payload: Partial<Card>) =>
    api.patch<Card>(`/cards/${cardId}`, payload),
  moveCard: (cardId: string, listId: string, position: number) =>
    api.patch<Card>(`/cards/${cardId}/move`, { list_id: listId, position }),
  deleteCard: (cardId: string) => api.delete(`/cards/${cardId}`),
  comments: (cardId: string) => api.get<Comment[]>(`/cards/${cardId}/comments`),
  addComment: (cardId: string, content: string) =>
    api.post<Comment>(`/cards/${cardId}/comments`, { content }),
  attachments: (cardId: string) => api.get<Attachment[]>(`/cards/${cardId}/attachments`),
  getAttachmentUploadUrl: (
    cardId: string,
    payload: { filename: string; content_type: string | null; size_bytes: number }
  ) => api.post<PresignedUploadResponse>(`/cards/${cardId}/attachments/upload-url`, payload),
  confirmAttachment: (cardId: string, attachmentId: string) =>
    api.post<Attachment>(`/cards/${cardId}/attachments/${attachmentId}/confirm`),
  deleteAttachment: (cardId: string, attachmentId: string) =>
    api.delete(`/cards/${cardId}/attachments/${attachmentId}`),
  importCards: (boardId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<CardImportResult>(`/boards/${boardId}/cards/import`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) {
    throw new Error("Upload failed");
  }
}

export async function uploadAttachment(cardId: string, file: File): Promise<Attachment> {
  let attachmentId: string | null = null;
  try {
    const { data } = await boardApi.getAttachmentUploadUrl(cardId, {
      filename: file.name,
      content_type: file.type || null,
      size_bytes: file.size,
    });
    attachmentId = data.attachment_id;
    await uploadFileToPresignedUrl(data.upload_url, file);
    const { data: attachment } = await boardApi.confirmAttachment(cardId, data.attachment_id);
    return attachment;
  } catch (error) {
    if (attachmentId) {
      try {
        await boardApi.deleteAttachment(cardId, attachmentId);
      } catch {
        // Best-effort cleanup
      }
    }
    throw error;
  }
}
