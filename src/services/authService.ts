import { apiFetch } from "./api";
import { UserProfile } from "../types";

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    return apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getCurrentUser(): Promise<UserProfile> {
    return apiFetch('/users/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return apiFetch('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getUsers(): Promise<UserProfile[]> {
    return apiFetch('/users');
  },

  async createUser(userData: Partial<UserProfile> & { password: string }): Promise<{ success: boolean }> {
    return apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async resetPassword(userId: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    return apiFetch(`/users/${userId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    });
  },

  async updateUser(userId: string, userData: Partial<UserProfile> & { password?: string }): Promise<{ success: boolean }> {
    return apiFetch(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    return apiFetch(`/users/${userId}`, {
      method: 'DELETE',
    });
  }
};
