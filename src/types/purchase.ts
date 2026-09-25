export interface SenaiItem {
  id: string;
  codigo: string;
  contrato: string;
  entidade: string;
  fornecedor: string;
  nome_fantasia: string;
  descricao: string;
  full_name: string;
  search_key?: string;
}

export interface SenaiItemsMeta {
  last_updated?: string;
  updated_by?: string;
  total_items?: number;
}

export interface PurchaseItem {
  item_name: string;           // vem do banco ou texto livre
  item_code?: string;          // código do produto FLUIG (opcional)
  contract_number?: string;    // contrato (opcional)
  quantity: number;
  reason: string;              // motivo puxado do banco ou informado
  is_new_item?: boolean;       // se é um novo item solicitado
  new_item_description?: string;
  new_item_photo_url?: string; // URL da foto (opcional)
  new_item_photo_path?: string;
  arrived?: boolean;           // Flag simples: se o item já chegou/entregue
  arrived_at?: string;         // Data/hora em que foi marcado como chegado
  arrived_by?: string;         // Nome do comprador que marcou
}

export interface PurchaseUpdate {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  numeric_id?: number;
  curso: string;
  turma: string;
  items: PurchaseItem[];
  status: 'pendente' | 'ciente' | 'em_andamento' | 'concluido' | 'cancelado';
  
  // Solicitante (supervisor)
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requester_role: string;
  unit: string;
  
  // Comprador
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  fluig_number?: string;        // número do Fluig preenchido pelo comprador
  
  // Informativos/comentários
  updates: PurchaseUpdate[];
  
  // Controle de e-mail
  email_paused?: boolean;       // comprador pode pausar envio de e-mails
  last_email_sent_at?: string;
  last_buyer_email_sent_at?: string;
  
  created_at: string;
  updated_at: string;
}
