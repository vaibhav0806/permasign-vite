import type { GetRoomsAdminResult, GetRoomMembersAdminResult, GetRoomDocumentsAdminResult, GetRoomDocumentsSignaturesAdminResult, GetRoomRolesAdminResult, GetRoleDocumentPermissionsAdminResult, GetAdminLogsResult } from "../types/types";
import { backendURL as API_ROOT } from "../types/types";

const API_BASE_URL = API_ROOT;

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    console.error("API Error:", errorMsg, "Full response:", data);
    throw new Error(errorMsg);
  }
  return data;
}

// Generic function to fetch admin data
async function getAdminData<T>(endpoint: string, params: Record<string, any>): Promise<T> {
  const query = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, String(params[key]));
    }
  }
  const response = await fetch(`${API_BASE_URL}/api/admin${endpoint}?${query.toString()}`);
  return handleResponse<T>(response);
}

// Specific functions for each admin endpoint
export const getAdminRooms = (params: { callerAddress: string; page?: number; roomName?: string; ownerEmail?: string; }) =>
  getAdminData<GetRoomsAdminResult>('/rooms', params);

export const getAdminRoomMembers = (params: { callerAddress: string; page?: number; roomId?: string; userEmail?: string; }) =>
  getAdminData<GetRoomMembersAdminResult>('/room-members', params);

export const getAdminRoomDocuments = (params: { callerAddress: string; page?: number; roomId?: string; uploaderEmail?: string; }) =>
  getAdminData<GetRoomDocumentsAdminResult>('/room-documents', params);

export const getAdminRoomDocumentsSignatures = (params: { callerAddress: string; page?: number; roomId?: string; documentId?: string; }) =>
  getAdminData<GetRoomDocumentsSignaturesAdminResult>('/document-signatures', params);

export const getAdminRoomRoles = (params: { callerAddress: string; page?: number; roomId?: string; }) =>
  getAdminData<GetRoomRolesAdminResult>('/room-roles', params);

export const getAdminRolePermissions = (params: { callerAddress: string; page?: number; roomId?: string; }) =>
  getAdminData<GetRoleDocumentPermissionsAdminResult>('/role-permissions', params);

export const getAdminLogs = (params: { callerAddress: string; page?: number; actor?: string; action?: string; status?: string; details?: string; }) =>
  getAdminData<GetAdminLogsResult>('/logs', params); 