import { apiFetch } from "./api";
import { Ticket, Comment, Status, Priority } from "../types";

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    return apiFetch('/tickets');
  },

  async getPublicTickets(): Promise<Partial<Ticket>[]> {
    return apiFetch('/tickets/public');
  },

  async trackTicket(id: string): Promise<{ ticket: Ticket; comments: Comment[] }> {
    return apiFetch(`/tickets/track/${id}`);
  },

  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket> {
    return apiFetch('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  },

  async getTicket(id: string): Promise<Ticket> {
    return apiFetch(`/tickets/${id}`);
  },

  async updateStatus(id: string, status: Status): Promise<{ success: boolean }> {
    return apiFetch(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async assignTechnician(id: string, assigned_to: string | null): Promise<{ success: boolean }> {
    return apiFetch(`/tickets/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to }),
    });
  },

  async updatePriority(id: string, priority: Priority): Promise<{ success: boolean }> {
    return apiFetch(`/tickets/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  async getComments(id: string): Promise<Comment[]> {
    return apiFetch(`/tickets/${id}/comments`);
  },

  async addComment(id: string, content: string, is_internal: boolean = false): Promise<Comment> {
    return apiFetch(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, is_internal }),
    });
  },

  async deleteTicket(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/tickets/${id}`, {
      method: 'DELETE',
    });
  }
};
