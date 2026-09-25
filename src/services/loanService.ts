import { apiFetch } from "./api";
import { Loan } from "../types";

export const loanService = {
  async getLoans(): Promise<Loan[]> {
    return apiFetch('/loans');
  },

  async getLoanByRegistration(registration: string): Promise<Loan[]> {
    return apiFetch(`/loans/registration/${encodeURIComponent(registration)}`);
  },

  async trackLoan(id: string): Promise<Loan> {
    return apiFetch(`/loans/track/${id}`);
  },

  async createLoan(loanData: Partial<Loan>): Promise<Loan> {
    return apiFetch('/loans', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
  },

  async authorizeLoan(id: string, terms?: string): Promise<{ success: boolean; loan: Loan }> {
    return apiFetch(`/loans/${id}/authorize`, {
      method: 'PATCH',
      body: JSON.stringify({ terms }),
    });
  },

  async rejectLoan(id: string, reason?: string): Promise<{ success: boolean }> {
    return apiFetch(`/loans/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async releaseLoan(id: string, pin: string, signature: string, checklist: string): Promise<{ success: boolean }> {
    return apiFetch(`/loans/${id}/release`, {
      method: 'POST',
      body: JSON.stringify({ pin, signature, checklist }),
    });
  },

  async returnLoan(id: string, signature: string, checklist: string, is_damaged?: boolean, damage_notes?: string): Promise<{ success: boolean }> {
    return apiFetch(`/loans/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ signature, checklist, is_damaged, damage_notes }),
    });
  },

  async completeLoan(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/loans/${id}/complete`, {
      method: 'PATCH',
    });
  }
};
