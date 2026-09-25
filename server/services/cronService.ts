import { db, isDummyFirebase, localDb, collection, getDocs, query, where, updateDoc, doc } from "../config/firebase.js";
import { sendEmail } from "../config/email.js";
import { buildPurchaseEmailHtml, getPurchaseRecipients } from "./emailService.js";

export async function checkAndAlertOverdueLoans() {
  console.log("⏰ [Rotina] Verificando se há empréstimos atrasados (+24h)...");
  try {
    let overdueLoans: any[] = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (isDummyFirebase) {
      overdueLoans = localDb.getLoans().filter((l: any) => 
        l.status === 'em_uso' && 
        new Date(l.released_at || l.created_at) < oneDayAgo
      );
    } else {
      if (db) {
        const q = query(collection(db, "loans"), where("status", "==", "em_uso"));
        const snap = await getDocs(q);
        overdueLoans = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((l: any) => new Date(l.released_at || l.created_at) < oneDayAgo);
      }
    }

    if (overdueLoans.length > 0) {
      console.log(`⚠️ [Rotina] Encontrados ${overdueLoans.length} empréstimos atrasados.`);
      const managerEmail = process.env.MANAGER_EMAIL;
      if (managerEmail) {
        const loansListHtml = overdueLoans.map((l: any) => `
          <li style="margin-bottom: 12px; padding: 12px; bg-color: #fff8f8; border: 1px solid #fbdad7; border-radius: 8px;">
            <strong>Equipamento:</strong> ${l.equipment} <br/>
            <strong>Solicitante:</strong> ${l.requester_name} (${l.registration}) <br/>
            <strong>Contato:</strong> ${l.email} | ${l.phone} <br/>
            <strong>Retirado em:</strong> ${new Date(l.released_at || l.created_at).toLocaleString('pt-BR')} <br/>
            <strong>Tempo em aberto:</strong> Mais de 24 horas ativo sem devolução.
          </li>
        `).join("");

        await sendEmail({
          to: managerEmail,
          subject: "⚠️ ALERTA: Empréstimos de Equipamento Atrasados (+24h)",
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fcd3d1; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(217,83,79,0.05);">
              <h2 style="color: #d9534f; margin-top: 0; border-bottom: 1px solid #fbdad7; padding-bottom: 12px;">Alerta de Atraso em Empréstimo</h2>
              <p>Os seguintes empréstimos de equipamentos ultrapassaram o limite de devolução recomendado (24 horas) e permanecem ativos:</p>
              <ul style="padding-left: 0; list-style-type: none;">
                ${loansListHtml}
              </ul>
              <p>Por favor, verifique a situação com os solicitantes ou realize a devolução manual caso o equipamento já tenha sido retornado fisicamente.</p>
              <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #777; text-align: center;">
                <p>Este é um e-mail automático enviado pelo sistema de Gestão de Empréstimos.</p>
              </div>
            </div>
          `
        });
      }
    } else {
      console.log("✅ [Rotina] Nenhum empréstimo atrasado encontrado.");
    }
  } catch (error) {
    console.error("❌ [Rotina] Erro ao verificar empréstimos atrasados:", error);
  }
}

export async function runDailyPendingOrdersCheck() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let pendingOrders: any[] = [];

    if (isDummyFirebase) {
      pendingOrders = localDb.getPurchases().filter((p: any) => 
        p.status === 'pendente' &&
        !p.email_paused &&
        new Date(p.created_at) < oneDayAgo &&
        (!p.last_email_sent_at || new Date(p.last_email_sent_at) < oneDayAgo)
      );
    } else if (db) {
      const q = query(collection(db, "purchases"), where("status", "==", "pendente"));
      const snap = await getDocs(q);
      pendingOrders = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => 
          !p.email_paused && 
          new Date(p.created_at) < oneDayAgo &&
          (!p.last_email_sent_at || new Date(p.last_email_sent_at) < oneDayAgo)
        );
    }

    if (pendingOrders.length > 0) {
      const { buyers } = await getPurchaseRecipients();
      const allBuyerEmails = buyers.map(b => b.email).filter(Boolean);

      for (const order of pendingOrders) {
        const isUnassigned = !order.buyer_id && !order.buyer_email;
        const recipients = isUnassigned 
          ? allBuyerEmails 
          : Array.from(new Set([order.buyer_email].filter(Boolean)));

        for (const email of recipients) {
          await sendEmail({
            to: email,
            subject: isUnassigned 
              ? `🛒 [Lembrete Compras] Pedido #${order.numeric_id || order.id} aguarda atribuição de comprador (+24h)`
              : `🛒 [Lembrete Compras] Pedido #${order.numeric_id || order.id} sob sua responsabilidade aguarda andamento (+24h)`,
            html: buildPurchaseEmailHtml({
              title: isUnassigned ? "Lembrete: Pedido sem Comprador Atribuído" : "Lembrete: Pedido de Compra Pendente",
              orderId: order.numeric_id || order.id,
              curso: order.curso,
              turma: order.turma,
              items: order.items,
              status: "Pendente",
              requesterName: order.requester_name,
              buyerName: order.buyer_name || "Ainda não atribuído",
              message: isUnassigned
                ? "Este pedido de compra foi criado há mais de 24 horas e ainda não possui comprador atribuído. Por favor, acesse o sistema para assumir o pedido."
                : "Este pedido de compra atribuído a você está pendente há mais de 24 horas e aguarda atualização ou cotação."
            })
          });
        }

        const nowIso = new Date().toISOString();
        if (isDummyFirebase) {
          localDb.updatePurchase(order.id, { last_email_sent_at: nowIso });
        } else if (db) {
          await updateDoc(doc(db, "purchases", order.id), { last_email_sent_at: nowIso });
        }
      }
    }
  } catch (err) {
    console.error("❌ [Rotina Compras] Erro ao verificar pedidos pendentes:", err);
  }
}

export async function runBiDailyBuyerStatusEmail() {
  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    let activeOrders: any[] = [];

    if (isDummyFirebase) {
      activeOrders = localDb.getPurchases().filter((p: any) => 
        (p.status === 'ciente' || p.status === 'em_andamento') &&
        !p.email_paused &&
        (!p.last_buyer_email_sent_at || new Date(p.last_buyer_email_sent_at) < twoDaysAgo)
      );
    } else if (db) {
      const q = query(collection(db, "purchases"), where("status", "in", ["ciente", "em_andamento"]));
      const snap = await getDocs(q);
      activeOrders = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => 
          !p.email_paused &&
          (!p.last_buyer_email_sent_at || new Date(p.last_buyer_email_sent_at) < twoDaysAgo)
        );
    }

    if (activeOrders.length > 0) {
      const { buyers } = await getPurchaseRecipients();
      const allBuyerEmails = buyers.map(b => b.email).filter(Boolean);

      for (const order of activeOrders) {
        const recipients = order.buyer_email 
          ? [order.buyer_email] 
          : allBuyerEmails;

        for (const email of recipients) {
          await sendEmail({
            to: email,
            subject: `[Compras Acompanhamento] Status Pedido #${order.numeric_id || order.id} (${order.status.toUpperCase()})`,
            html: buildPurchaseEmailHtml({
              title: "Acompanhamento Periódico de Pedido",
              orderId: order.numeric_id || order.id,
              curso: order.curso,
              turma: order.turma,
              items: order.items,
              status: order.status,
              requesterName: order.requester_name,
              buyerName: order.buyer_name || "Ainda não atribuído",
              message: `Pedido em andamento. Fluig cadastrado: ${order.fluig_number || 'Ainda não informado'}.`
            })
          });
        }

        const nowIso = new Date().toISOString();
        if (isDummyFirebase) {
          localDb.updatePurchase(order.id, { last_buyer_email_sent_at: nowIso });
        } else if (db) {
          await updateDoc(doc(db, "purchases", order.id), { last_buyer_email_sent_at: nowIso });
        }
      }
    }
  } catch (err) {
    console.error("❌ [Rotina Compras] Erro ao enviar status periódico:", err);
  }
}

export function startBackgroundRoutines() {
  setTimeout(() => {
    checkAndAlertOverdueLoans();
    runDailyPendingOrdersCheck();
    runBiDailyBuyerStatusEmail();
  }, 10000);

  setInterval(() => {
    checkAndAlertOverdueLoans();
    runDailyPendingOrdersCheck();
    runBiDailyBuyerStatusEmail();
  }, 60 * 60 * 1000);
}
