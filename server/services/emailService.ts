import { sendEmail } from "../config/email.js";
import { db, isDummyFirebase, localDb, collection, getDocs } from "../config/firebase.js";

const APP_URL = process.env.APP_URL || "https://solicitacoesporto.vercel.app";

// ============================================================
// TIPOS
// ============================================================
export interface PurchaseEmailData {
  title: string;
  orderId: string | number;
  curso: string;
  turma: string;
  items?: any[];
  status: string;
  requesterName?: string;
  buyerName?: string;
  message?: string;
  actionUrl?: string;
}

// ============================================================
// UTILITÁRIOS
// ============================================================
const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em Atendimento",
  pendente: "Pendente",
  concluido: "Concluído",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgente: "#dc2626",
  medio: "#d97706",
  baixo: "#2563eb",
};

function ticketSummaryBlock(ticket: any, headerColor: string) {
  const idStr = ticket.numeric_id ? `#${ticket.numeric_id}` : `#${ticket.id}`;
  const statusLabel = STATUS_LABELS[ticket.status] || ticket.status || "Pendente";
  const priorityColor = PRIORITY_COLORS[ticket.priority] || "#2563eb";
  const trackUrl = `${APP_URL}/track/${ticket.numeric_id || ticket.id}`;

  return `
    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Resumo da Solicitação:</h4>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Chamado:</strong> ${idStr}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Categoria:</strong> ${ticket.category || "Geral"}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Local/Ambiente:</strong> ${ticket.location || ticket.room || "Não informado"}</p>
      ${ticket.equipment ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Equipamento/Item:</strong> ${ticket.equipment}</p>` : ""}
      <p style="margin: 4px 0; font-size: 14px; color: #334155;">
        <strong>Status:</strong>
        <span style="font-weight: bold; color: ${headerColor};">${statusLabel.toUpperCase()}</span>
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;">
        <strong>Prioridade:</strong>
        <span style="font-weight: bold; color: ${priorityColor};">${(ticket.priority || "baixo").toUpperCase()}</span>
      </p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${trackUrl}" style="display: inline-block; background: ${headerColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: bold;">
        Acompanhar Chamado ${idStr}
      </a>
    </div>
  `;
}

function emailWrapper(headerColor: string, headerTitle: string, idStr: string, body: string) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="background: ${headerColor}; padding: 18px 24px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; color: #ffffff;">${headerTitle}</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #ffffff; opacity: 0.9;">SENAI Porto — Chamado ${idStr}</p>
      </div>
      ${body}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
        Notificação automática — Sistema de Solicitações Porto
      </p>
    </div>
  `;
}

// ============================================================
// COMPRAS — não alterado
// ============================================================
export function buildPurchaseEmailHtml({
  title, orderId, curso, turma, items, status, requesterName, buyerName, message
}: PurchaseEmailData): string {
  const itemsHtml = items && items.length > 0 ? `
    <div style="margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Itens do Pedido:</h4>
      ${items.map((it: any, idx: number) => `
        <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin-bottom: 6px; font-size: 14px; color: #1e293b;">
          <strong>${idx + 1}. ${it.item_name}</strong> &times; ${it.quantity} un
          ${it.reason ? `<br/><span style="font-size: 12px; color: #64748b;">Motivo: ${it.reason}</span>` : ''}
          ${it.is_new_item && it.new_item_description ? `<br/><span style="font-size: 12px; color: #d97706;">[Novo Item] ${it.new_item_description}</span>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="background: #15803d; padding: 18px 24px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; color: #ffffff;">${title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #dcfce7;">SENAI Porto — Pedido #${orderId}</p>
      </div>
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">Notificação automática do Sistema de Gestão e Compras — SENAI Porto.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Curso:</strong> ${curso || 'Não informado'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Turma:</strong> ${turma || 'Não informado'}</p>
        ${requesterName ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Solicitante:</strong> ${requesterName}</p>` : ''}
        ${buyerName ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Comprador Responsável:</strong> ${buyerName}</p>` : ''}
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Status:</strong> <span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase;">${(status || 'pendente').toUpperCase()}</span></p>
      </div>
      ${itemsHtml}
      ${message ? `
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 14px; color: #334155; white-space: pre-wrap;">${message}</p>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">Sistema de Solicitações &amp; Compras — SENAI Porto</p>
    </div>
  `;
}

export async function getPurchaseRecipients() {
  let buyers: { email: string; name: string; id?: string; role?: string; departments?: string[] }[] = [];
  let managers: { email: string; name: string; id?: string }[] = [];

  const processUser = (u: any) => {
    if (!u || !u.email) return;
    const rawEmail = String(u.email).trim();
    const emailLower = rawEmail.toLowerCase();
    if (!emailLower.includes('@')) return;

    let depts: string[] = [];
    if (Array.isArray(u.departments)) {
      depts = u.departments.map((d: any) => String(d).trim());
    } else if (u.department) {
      depts = [String(u.department).trim()];
    } else if (typeof u.departments === 'string') {
      depts = [u.departments.trim()];
    }

    const deptsLower = depts.map(d => d.toLowerCase());
    const isDeptCompras = deptsLower.some(d => d === 'compras' || d.includes('compra') || d.includes('suprimento') || d.includes('almoxarifado'));
    const allowedModules: string[] = Array.isArray(u.allowed_modules) ? u.allowed_modules : [];
    const hasComprasAtender = allowedModules.includes('compras') || allowedModules.includes('compras_atender');
    const roleLower = String(u.role || '').toLowerCase().trim();
    const isBuyerRole = roleLower === 'comprador' || roleLower === 'compras';

    if (isBuyerRole || hasComprasAtender || (isDeptCompras && (roleLower === 'comprador' || roleLower === 'tecnico' || roleLower === 'analista' || roleLower === 'assistente' || roleLower === 'gestor'))) {
      if (!buyers.some(b => b.email.toLowerCase() === emailLower)) {
        buyers.push({ email: rawEmail, name: u.name || 'Comprador', id: u.id, role: u.role, departments: depts });
      }
    }

    if (roleLower === 'gestor' && (isDeptCompras || deptsLower.some(d => d.includes('supervis')))) {
      if (!managers.some(m => m.email.toLowerCase() === emailLower)) {
        managers.push({ email: rawEmail, name: u.name || 'Gestor', id: u.id });
      }
    }
  };

  if (isDummyFirebase) {
    localDb.getUsers().forEach(processUser);
  } else if (db) {
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.docs.forEach(d => processUser({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Error fetching purchase recipients from Firestore:", e);
    }
  }

  const envBuyers = (process.env.BUYERS_EMAILS || process.env.COMPRADORES_EMAILS || "")
    .split(",").map(e => e.trim()).filter(e => e.includes("@"));

  envBuyers.forEach(email => {
    if (!buyers.some(b => b.email.toLowerCase() === email.toLowerCase())) {
      buyers.push({ email, name: "Comprador (ENV)" });
    }
  });

  if (buyers.length === 0) {
    const fallbackUser = (u: any) => {
      if (!u || !u.email) return;
      const rawEmail = String(u.email).trim();
      if (!rawEmail.includes('@')) return;
      const roleLower = String(u.role || '').toLowerCase().trim();
      if (roleLower === 'comprador' || roleLower === 'admin' || roleLower === 'gestor') {
        if (!buyers.some(b => b.email.toLowerCase() === rawEmail.toLowerCase())) {
          buyers.push({ email: rawEmail, name: u.name || u.role, id: u.id });
        }
      }
    };
    if (isDummyFirebase) {
      localDb.getUsers().forEach(fallbackUser);
    } else if (db) {
      try {
        const snap = await getDocs(collection(db, "users"));
        snap.docs.forEach(d => fallbackUser({ id: d.id, ...d.data() }));
      } catch (err) {}
    }
  }

  const defaultRecipients = ["dluiz@findes.org.br", "admregionalvitoria@gmail.com"];
  defaultRecipients.forEach(email => {
    if (!buyers.some(b => b.email.toLowerCase() === email.toLowerCase())) {
      buyers.push({ email, name: email.includes('dluiz') ? 'Davi Moreira Luiz' : 'Administrador', id: email });
    }
  });

  return { buyers, managers };
}

// ============================================================
// EMPRÉSTIMOS
// ============================================================
export function notifyManagerAboutNewLoan(loan: any) {
  const managerEmail = process.env.MANAGER_EMAIL;
  if (!managerEmail) {
    console.warn("⚠️ MANAGER_EMAIL não configurado. Alerta de empréstimo não enviado.");
    return;
  }

  sendEmail({
    to: managerEmail,
    subject: `Nova Solicitação de Empréstimo: ${loan.equipment} - ${loan.requester_name}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 12px; padding: 24px;">
        <h2 style="color: #007bff;">Nova Solicitação de Empréstimo</h2>
        <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; border-radius: 4px;">
          <p><strong>Equipamento:</strong> ${loan.equipment}</p>
          <p><strong>Solicitante:</strong> ${loan.requester_name} (${loan.registration})</p>
          <p><strong>E-mail:</strong> ${loan.email}</p>
          <p><strong>Telefone:</strong> ${loan.phone}</p>
          <p><strong>Local:</strong> ${loan.location}</p>
          <p><strong>Motivo:</strong> ${loan.reason}</p>
          <p><strong>Solicitado em:</strong> ${new Date(loan.created_at).toLocaleString('pt-BR')}</p>
        </div>
        <p style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">Notificação automática — Sistema de Gestão de Empréstimos.</p>
      </div>
    `
  }).catch(e => console.error("Error sending manager loan notification:", e));
}

export function notifyUserAboutAuthorization(loan: any) {
  if (!loan.email) return;

  sendEmail({
    to: loan.email,
    subject: `Empréstimo Aprovado: ${loan.equipment}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 12px; padding: 24px;">
        <h2 style="color: #28a745; text-align: center;">Sua Solicitação foi Aprovada!</h2>
        <p>Olá <strong>${loan.requester_name}</strong>,</p>
        <p>O empréstimo para <strong>${loan.equipment}</strong> foi autorizado. Seu PIN de Liberação:</p>
        <div style="text-align: center; margin: 25px 0;">
          <div style="display: inline-block; background-color: #e8f5e9; border: 2px dashed #28a745; border-radius: 12px; padding: 15px 30px; font-family: monospace; font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 4px;">
            ${loan.pin}
          </div>
        </div>
        ${loan.terms ? `<div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px;"><strong>Termos do Empréstimo:</strong><p style="font-size: 14px;">${loan.terms}</p></div>` : ''}
        <p>Acesse o acompanhamento com matrícula <strong>${loan.registration}</strong>, confirme o PIN e assine os termos.</p>
        <p style="font-size: 12px; color: #777; text-align: center;">Notificação automática — Sistema de Gestão de Empréstimos.</p>
      </div>
    `
  }).catch(e => console.error("Error sending authorization notification:", e));
}

// ============================================================
// CHAMADOS — Notificação para dluiz@findes.org.br (novo chamado)
// ============================================================
export function notifyNewTicket(ticket: any) {
  const targetEmail = process.env.MANAGER_EMAIL || "dluiz@findes.org.br";
  const idStr = ticket.numeric_id ? `#${ticket.numeric_id}` : `#${ticket.id}`;
  const category = ticket.category || "Geral";
  const equipmentOrReason = ticket.equipment || ticket.reason || ticket.description || "Solicitação";
  const priorityColor = PRIORITY_COLORS[ticket.priority] || "#2563eb";
  const adminUrl = `${APP_URL}/dashboard`;

  const html = emailWrapper(
    "#2563eb",
    "Novo Chamado ABERTO",
    idStr,
    `
    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
      Uma nova solicitação foi criada no sistema de chamados.
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Chamado:</strong> ${idStr}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Solicitante:</strong> ${ticket.requester_name || 'Não informado'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>E-mail:</strong> ${ticket.email || ticket.requester_email || 'Não informado'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Matrícula:</strong> ${ticket.registration || 'Não informada'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Telefone:</strong> ${ticket.phone || 'Não informado'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Unidade:</strong> ${ticket.unit || ticket.department || 'PORTO'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Ambiente/Local:</strong> ${ticket.location || ticket.room || 'Não informado'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Categoria:</strong> ${category}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;">
        <strong>Prioridade:</strong>
        <span style="font-weight: bold; color: ${priorityColor};">${(ticket.priority || 'baixo').toUpperCase()}</span>
      </p>
      ${ticket.equipment ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Equipamento/Item:</strong> ${ticket.equipment}</p>` : ''}
      ${ticket.urgent_explanation ? `<p style="margin: 4px 0; font-size: 14px; color: #dc2626;"><strong>Motivo Urgência:</strong> ${ticket.urgent_explanation}</p>` : ''}
    </div>

    <div style="background: #f1f5f9; padding: 14px; border-radius: 6px; margin: 16px 0;">
      <strong style="font-size: 13px; color: #475569; text-transform: uppercase; display: block; margin-bottom: 6px;">Descrição / Motivo:</strong>
      <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-wrap;">${ticket.description || ticket.reason || 'Sem descrição'}</p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${adminUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: bold;">
        Abrir Painel Admin
      </a>
    </div>
    `
  );

  sendEmail({
    to: targetEmail,
    subject: `Novo Chamado ${idStr}: ${category} - ${equipmentOrReason}`,
    html
  }).catch(e => console.error("Error sending new ticket email:", e));
}

// ============================================================
// CHAMADOS — Confirmação de abertura para o SOLICITANTE
// ============================================================
export function notifyRequesterTicketOpened(ticket: any) {
  const recipientEmail = (ticket.email || ticket.requester_email || "").trim();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(`⚠️ [E-mail] Sem e-mail do solicitante para o chamado #${ticket.numeric_id || ticket.id}.`);
    return;
  }

  const idStr = ticket.numeric_id ? `#${ticket.numeric_id}` : `#${ticket.id}`;
  const trackUrl = `${APP_URL}/track/${ticket.numeric_id || ticket.id}`;

  const html = emailWrapper(
    "#2563eb",
    "Chamado Aberto com Sucesso!",
    idStr,
    `
    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
      Olá, <strong>${ticket.requester_name || 'Solicitante'}</strong>!
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
      Seu chamado foi registrado com sucesso. Nossa equipe irá analisar e entrar em contato em breve.
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Número do Chamado:</strong> ${idStr}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Categoria:</strong> ${ticket.category || 'Geral'}</p>
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Local/Ambiente:</strong> ${ticket.location || ticket.room || 'Não informado'}</p>
      ${ticket.equipment ? `<p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Equipamento/Item:</strong> ${ticket.equipment}</p>` : ''}
      <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Status:</strong> <span style="font-weight: bold; color: #2563eb;">ABERTO</span></p>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Você receberá notificações por e-mail a cada atualização do seu chamado. Também pode acompanhar pelo link abaixo:
    </p>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${trackUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: bold;">
        Acompanhar Chamado ${idStr}
      </a>
    </div>
    `
  );

  sendEmail({
    to: recipientEmail,
    subject: `Chamado ${idStr} Aberto - SENAI Porto`,
    html
  }).catch(e => console.error(`Error sending ticket open confirmation to ${recipientEmail}:`, e));
}

// ============================================================
// CHAMADOS — Atualizações para o SOLICITANTE
// ============================================================
export function notifyTicketUpdateToRequester(ticket: any, updateInfo: {
  type: 'status' | 'priority' | 'comment' | 'assigned';
  oldVal?: string;
  newVal?: string;
  commentText?: string;
  authorName?: string;
  isInternal?: boolean;
}) {
  // Não notificar em abertura (já tratado por notifyRequesterTicketOpened)
  if (updateInfo.type === 'status' && updateInfo.newVal === 'aberto' && !updateInfo.oldVal) {
    return;
  }

  // Não notificar comentários internos
  if (updateInfo.type === 'comment' && updateInfo.isInternal) {
    return;
  }

  const recipientEmail = (ticket.email || ticket.requester_email || "").trim();
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(`⚠️ [E-mail] Sem e-mail do solicitante para o chamado #${ticket.numeric_id || ticket.id}.`);
    return;
  }

  const idStr = ticket.numeric_id ? `#${ticket.numeric_id}` : `#${ticket.id}`;
  const titleItem = ticket.equipment || ticket.reason || ticket.category || "Solicitação";

  let updateSubject = `Atualizacao no Chamado ${idStr}`;
  let headerTitle = "Movimentação no Seu Chamado";
  let headerColor = "#2563eb";
  let updateMessage = "";

  if (updateInfo.type === 'status') {
    const newStatusLabel = STATUS_LABELS[updateInfo.newVal || ticket.status] || (updateInfo.newVal || ticket.status);
    if (updateInfo.newVal === 'concluido') {
      updateSubject = `Chamado ${idStr} CONCLUIDO: ${titleItem}`;
      headerTitle = "Seu Chamado Foi Concluído!";
      headerColor = "#16a34a";
      updateMessage = `O seu chamado ${idStr} foi <strong>CONCLUÍDO</strong>. Obrigado por utilizar o sistema de solicitações do SENAI Porto!`;
    } else if (updateInfo.newVal === 'em_atendimento') {
      updateSubject = `Chamado ${idStr} em Atendimento`;
      headerTitle = "Seu Chamado Está em Atendimento";
      headerColor = "#7c3aed";
      updateMessage = `Boa notícia! Um técnico assumiu o seu chamado ${idStr} e está trabalhando na solução.`;
    } else if (updateInfo.newVal === 'pendente') {
      updateSubject = `Chamado ${idStr} Pendente`;
      headerTitle = "Chamado Aguardando Ação";
      headerColor = "#d97706";
      updateMessage = `O seu chamado ${idStr} foi marcado como <strong>PENDENTE</strong>. Pode ser que seja necessário alguma informação adicional de sua parte.`;
    } else {
      updateSubject = `Status Alterado: Chamado ${idStr} (${newStatusLabel})`;
      updateMessage = `O status do seu chamado ${idStr} foi atualizado para <strong>${newStatusLabel.toUpperCase()}</strong>.`;
    }
  } else if (updateInfo.type === 'comment') {
    updateSubject = `Nova Mensagem no Chamado ${idStr}`;
    headerTitle = "Novo Comentário no Seu Chamado";
    headerColor = "#0891b2";
    updateMessage = `O técnico <strong>${updateInfo.authorName || 'Responsável'}</strong> adicionou uma mensagem ao seu chamado:`;
  } else if (updateInfo.type === 'assigned') {
    updateSubject = `Tecnico Atribuido ao Chamado ${idStr}`;
    headerTitle = "Técnico Responsável Definido";
    headerColor = "#7c3aed";
    updateMessage = `O técnico <strong>${updateInfo.newVal || 'Responsável'}</strong> assumiu o atendimento do seu chamado ${idStr}.`;
  } else if (updateInfo.type === 'priority') {
    const priorLabels: Record<string, string> = { urgente: 'URGENTE', medio: 'MÉDIO', baixo: 'BAIXO' };
    updateSubject = `Prioridade Alterada no Chamado ${idStr}`;
    headerColor = PRIORITY_COLORS[updateInfo.newVal || ''] || "#2563eb";
    updateMessage = `A prioridade do seu chamado ${idStr} foi ajustada para <strong>${priorLabels[updateInfo.newVal || ''] || (updateInfo.newVal || '').toUpperCase()}</strong>.`;
  }

  const html = emailWrapper(
    headerColor,
    headerTitle,
    idStr,
    `
    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
      Olá, <strong>${ticket.requester_name || 'Solicitante'}</strong>!
    </p>

    <div style="background: #f8fafc; border-left: 4px solid ${headerColor}; padding: 16px; margin: 16px 0; border-radius: 0 6px 6px 0; font-size: 15px; color: #1e293b;">
      ${updateMessage}
      ${updateInfo.commentText ? `
        <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-top: 12px; font-style: italic; color: #334155; white-space: pre-wrap;">
          "${updateInfo.commentText}"
        </div>
      ` : ''}
    </div>

    ${ticketSummaryBlock({ ...ticket, status: updateInfo.newVal || ticket.status }, headerColor)}
    `
  );

  sendEmail({
    to: recipientEmail,
    subject: updateSubject,
    html
  }).catch(e => console.error(`Error sending update email to ${recipientEmail}:`, e));
}
