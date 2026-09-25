import { apiFetch } from "./api";
import { PurchaseOrder, SenaiItem, SenaiItemsMeta } from "../types";

export const purchaseService = {
  async getPurchases(): Promise<PurchaseOrder[]> {
    return apiFetch('/purchases');
  },

  async getPurchaseById(id: string): Promise<PurchaseOrder> {
    return apiFetch(`/purchases/${id}`);
  },

  async getCatalogItems(): Promise<{ items: SenaiItem[]; meta: SenaiItemsMeta }> {
    return apiFetch('/purchases/items');
  },

  async uploadCatalogItems(formData: FormData): Promise<any> {
    return apiFetch('/purchases/upload-items', {
      method: 'POST',
      body: formData,
    });
  },

  async getReasons(): Promise<string[]> {
    return apiFetch('/purchases/reasons');
  },

  async getRecipients(): Promise<{ buyers: any[]; managers: any[] }> {
    return apiFetch('/purchases/recipients');
  },

  async testEmail(to: string): Promise<{ success: boolean; message?: string }> {
    return apiFetch('/purchases/test-email', {
      method: 'POST',
      body: JSON.stringify({ to }),
    });
  },

  async createPurchase(purchaseData: { curso: string; turma: string; items: any[]; notes?: string }): Promise<PurchaseOrder> {
    return apiFetch('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  async assignBuyer(id: string, buyerData?: { buyer_id?: string; buyer_name?: string; buyer_email?: string }): Promise<{ success: boolean; buyer_name: string }> {
    return apiFetch(`/purchases/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(buyerData || {}),
    });
  },

  async updateStatus(id: string, statusData: { status: string; fluig_number?: string; notes?: string }): Promise<{ success: boolean }> {
    return apiFetch(`/purchases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  },

  async updateDetails(id: string, updateData: { curso?: string; turma?: string; items?: any[]; fluig_number?: string; notes?: string }): Promise<{ success: boolean }> {
    return apiFetch(`/purchases/${id}/update`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  async requestUpdate(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/purchases/${id}/request-update`, {
      method: 'POST',
    });
  },

  async pauseEmails(id: string, email_paused: boolean): Promise<{ success: boolean; email_paused: boolean }> {
    return apiFetch(`/purchases/${id}/pause-emails`, {
      method: 'PATCH',
      body: JSON.stringify({ email_paused }),
    });
  }
};
