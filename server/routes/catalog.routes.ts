import { Router } from "express";
import { parseSenaiItemsFromCSV } from "../../src/lib/csvParser.js";
import { db, isDummyFirebase, localDb, collection, getDocs, getDoc, addDoc, doc, updateDoc, query, where, runTransaction } from "../config/firebase.js";
import { upload } from "../config/upload.js";
import { authenticate, userHasModuleAccess } from "../middleware/auth.js";
import { sendEmail } from "../config/email.js";
import { buildPurchaseEmailHtml, getPurchaseRecipients } from "../services/emailService.js";

const router = Router();

// Catalog: List available SENAI items
router.get("/purchases/items", async (req, res) => {
  if (isDummyFirebase) {
    const data = localDb.getAvailableItems();
    return res.json(data);
  }

  if (!db) {
    const data = localDb.getAvailableItems();
    return res.json(data);
  }

  try {
    const docRef = doc(db, "settings", "available_items");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return res.json({
        items: data.items || [],
        meta: {
          lastUpdated: data.lastUpdated,
          updatedBy: data.updatedBy,
          totalSenaiItems: data.totalSenaiItems || (data.items || []).length
        }
      });
    }

    const localData = localDb.getAvailableItems();
    if (localData.items && localData.items.length > 0) {
      return res.json(localData);
    }

    return res.json({ items: [], meta: {} });
  } catch (error: any) {
    console.error("Error fetching available items:", error);
    const fallback = localDb.getAvailableItems();
    return res.json(fallback);
  }
});

// Upload CSV/JSON or save SENAI Items Catalog
router.post("/purchases/upload-items", authenticate, upload.single("file"), async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "comprador" && user.role !== "gestor") {
      return res.status(403).json({ error: "Apenas administradores, compradores ou gestores podem atualizar a lista de itens." });
    }

    const mode = req.body.mode || "replace";
    const resolveConflicts = req.body.resolveConflicts || "check";
    let incomingItems: any[] = [];

    if (req.file) {
      const filename = req.file.originalname.toLowerCase();
      if (filename.endsWith(".csv")) {
        incomingItems = parseSenaiItemsFromCSV(req.file.buffer);
      } else if (filename.endsWith(".json")) {
        const text = req.file.buffer.toString("utf-8");
        const parsed = JSON.parse(text);
        incomingItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
      } else {
        return res.status(400).json({ error: "Formato de arquivo inválido. Envie um CSV ou JSON." });
      }
    } else if (req.body.items) {
      incomingItems = typeof req.body.items === "string" ? JSON.parse(req.body.items) : req.body.items;
    } else {
      return res.status(400).json({ error: "Nenhum arquivo ou lista de itens fornecida." });
    }

    if (!Array.isArray(incomingItems) || incomingItems.length === 0) {
      return res.status(400).json({ error: "Nenhum item válido encontrado para importação." });
    }

    if (isDummyFirebase || !db) {
      const result = localDb.setAvailableItems(incomingItems, user.name || user.email, mode, resolveConflicts);
      return res.json(result);
    }

    const docRef = doc(db, "settings", "available_items");
    const docSnap = await getDoc(docRef);
    const existingItems = docSnap.exists() ? (docSnap.data().items || []) : [];

    if (mode === "replace") {
      const meta = {
        items: incomingItems,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.name || user.email,
        totalSenaiItems: incomingItems.length
      };
      await updateDoc(docRef, meta).catch(async () => {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(docRef, meta);
      });
      localDb.setAvailableItems(incomingItems, user.name || user.email, "replace", "overwrite");
      return res.json({
        success: true,
        count: incomingItems.length,
        meta: { lastUpdated: meta.lastUpdated, updatedBy: meta.updatedBy, totalSenaiItems: meta.totalSenaiItems },
        message: `Base zerada e ${incomingItems.length} novos itens do SENAI importados!`
      });
    }

    const conflicts: any[] = [];
    const newItems: any[] = [];
    const existingMapByCode = new Map<string, any>();
    const existingMapByName = new Map<string, any>();

    for (const item of existingItems) {
      if (item.codigo) existingMapByCode.set(item.codigo.toString().trim(), item);
      if (item.full_name) existingMapByName.set(item.full_name.toLowerCase().trim(), item);
    }

    for (const incoming of incomingItems) {
      const incCode = incoming.codigo ? incoming.codigo.toString().trim() : "";
      const incName = incoming.full_name ? incoming.full_name.toLowerCase().trim() : "";
      const match = (incCode && existingMapByCode.get(incCode)) || (incName && existingMapByName.get(incName));
      if (match) {
        conflicts.push({ codigo: incoming.codigo || match.codigo, existing: match, incoming });
      } else {
        newItems.push(incoming);
      }
    }

    if (conflicts.length > 0 && resolveConflicts === "check") {
      return res.json({
        hasConflicts: true,
        conflicts,
        newItemsCount: newItems.length,
        totalCsvItems: incomingItems.length,
        message: `Foram encontrados ${conflicts.length} conflito(s) com itens já existentes.`
      });
    }

    let finalItems: any[] = [];
    if (resolveConflicts === "overwrite") {
      const conflictCodes = new Set(conflicts.map(c => c.codigo?.toString().trim()));
      const conflictNames = new Set(conflicts.map(c => c.incoming?.full_name?.toLowerCase().trim()));
      const filteredExisting = existingItems.filter((ex: any) => {
        const exCode = ex.codigo ? ex.codigo.toString().trim() : "";
        const exName = ex.full_name ? ex.full_name.toLowerCase().trim() : "";
        return !conflictCodes.has(exCode) && !conflictNames.has(exName);
      });
      finalItems = [...filteredExisting, ...incomingItems];
    } else {
      finalItems = [...existingItems, ...newItems];
    }

    const meta = {
      items: finalItems,
      lastUpdated: new Date().toISOString(),
      updatedBy: user.name || user.email,
      totalSenaiItems: finalItems.length
    };

    await updateDoc(docRef, meta).catch(async () => {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(docRef, meta);
    });

    localDb.setAvailableItems(finalItems, user.name || user.email, "replace", "overwrite");

    return res.json({
      success: true,
      count: finalItems.length,
      conflictsResolved: conflicts.length,
      meta: { lastUpdated: meta.lastUpdated, updatedBy: meta.updatedBy, totalSenaiItems: meta.totalSenaiItems },
      message: `Itens adicionados/mesclados com sucesso! Total no banco: ${finalItems.length} itens.`
    });
  } catch (error: any) {
    console.error("Error uploading SENAI items:", error);
    res.status(500).json({ error: error.message || "Erro ao processar arquivo de itens." });
  }
});

// Reasons list
router.get("/purchases/reasons", (req, res) => {
  const defaultReasons = [
    "Reposição de Estoque",
    "Consumo em Aula Prática",
    "Manutenção de Equipamento / Laboratório",
    "Projeto de Alunos / TCC",
    "Evento / Apresentação Institucional",
    "EPI / Segurança do Trabalho",
    "Nova Demanda Curricular",
    "Outro"
  ];
  res.json(defaultReasons);
});

// Get purchase email recipients
router.get("/purchases/recipients", authenticate, async (req, res) => {
  try {
    const recipients = await getPurchaseRecipients();
    res.json(recipients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test email configuration
router.post("/purchases/test-email", authenticate, async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: "E-mail de destino obrigatório." });

  const result = await sendEmail({
    to,
    subject: "🧪 Teste de Conexão SMTP - SENAI Porto",
    html: buildPurchaseEmailHtml({
      title: "Teste de E-mail de Notificação",
      orderId: "TEST-001",
      curso: "Engenharia de Software",
      turma: "2026/1",
      status: "Em Teste",
      items: [{ item_name: "Item de Teste 1", quantity: 5, reason: "Validação do Servidor SMTP" }],
      requesterName: "Administrador do Sistema",
      message: "Este e-mail confirma que as configurações de SMTP estão funcionando perfeitamente."
    })
  });

  if (result.success) {
    res.json({ success: true, message: `E-mail de teste enviado com sucesso para ${to}` });
  } else {
    res.status(500).json({ error: result.error || "Falha ao enviar e-mail de teste." });
  }
});

// Create Purchase Request
router.post("/purchases", authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!userHasModuleAccess(user, "compras_solicitar") && !userHasModuleAccess(user, "compras")) {
    return res.status(403).json({ error: "Você não tem permissão para criar solicitações de compra." });
  }

  const { curso, turma, items, notes } = req.body;
  if (!curso || !turma || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Curso, turma e pelo menos um item são obrigatórios." });
  }

  const sanitizedItems = items.map((it: any) => ({
    item_id: it.item_id || it.id || "",
    item_name: it.item_name || it.name || "Item sem nome",
    quantity: Number(it.quantity) || 1,
    reason: it.reason || "Não informado",
    is_new_item: !!it.is_new_item,
    new_item_description: it.new_item_description || ""
  }));

  const purchaseData = {
    requester_id: user.id,
    requester_name: user.name,
    requester_email: user.email,
    curso,
    turma,
    items: sanitizedItems,
    notes: notes || "",
    status: "pendente",
    buyer_id: null,
    buyer_name: null,
    buyer_email: null,
    fluig_number: "",
    status_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isDummyFirebase || !db) {
    try {
      const created = localDb.addPurchase(purchaseData);
      getPurchaseRecipients().then(recipients => {
        recipients.buyers.forEach(buyer => {
          if (buyer.email) {
            sendEmail({
              to: buyer.email,
              subject: `🛒 Novo Pedido de Compra #${created.numeric_id || created.id} — ${curso} (${turma})`,
              html: buildPurchaseEmailHtml({
                title: "Novo Pedido de Compra Criado",
                orderId: created.numeric_id || created.id,
                curso,
                turma,
                items: sanitizedItems,
                status: "Pendente",
                requesterName: user.name,
                message: notes ? `Observações do Solicitante:\n${notes}` : undefined
              })
            }).catch(e => console.error("Error sending creation email to buyer:", e));
          }
        });
      }).catch(err => console.error("Error getting purchase recipients:", err));

      return res.json(created);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  try {
    const counterRef = doc(db, "counters", "purchases");
    let numeric_id = 1;

    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { current: 1 });
        numeric_id = 1;
      } else {
        numeric_id = (counterDoc.data().current || 0) + 1;
        transaction.update(counterRef, { current: numeric_id });
      }
    });

    const docRef = await addDoc(collection(db, "purchases"), {
      numeric_id,
      ...purchaseData
    });

    const fullOrder = { id: docRef.id, numeric_id, ...purchaseData };

    getPurchaseRecipients().then(recipients => {
      recipients.buyers.forEach(buyer => {
        if (buyer.email) {
          sendEmail({
            to: buyer.email,
            subject: `🛒 Novo Pedido de Compra #${numeric_id} — ${curso} (${turma})`,
            html: buildPurchaseEmailHtml({
              title: "Novo Pedido de Compra Criado",
              orderId: numeric_id,
              curso,
              turma,
              items: sanitizedItems,
              status: "Pendente",
              requesterName: user.name,
              message: notes ? `Observações do Solicitante:\n${notes}` : undefined
            })
          }).catch(e => console.error("Error sending creation email to buyer:", e));
        }
      });
    }).catch(err => console.error("Error getting recipients:", err));

    res.json(fullOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Purchase Orders
router.get("/purchases", authenticate, async (req, res) => {
  const user = (req as any).user;

  if (isDummyFirebase || !db) {
    let orders = localDb.getPurchases();
    const canManage = user.role === "admin" || user.role === "comprador" || user.role === "gestor" || userHasModuleAccess(user, "compras_atender");
    if (!canManage) {
      orders = orders.filter(o => o.requester_id === user.id || o.requester_email === user.email);
    }
    return res.json(orders);
  }

  try {
    const snap = await getDocs(collection(db, "purchases"));
    let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const canManage = user.role === "admin" || user.role === "comprador" || user.role === "gestor" || userHasModuleAccess(user, "compras_atender");
    if (!canManage) {
      orders = orders.filter((o: any) => o.requester_id === user.id || o.requester_email === user.email);
    }

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single Purchase Order by ID
router.get("/purchases/:id", authenticate, async (req, res) => {
  if (isDummyFirebase || !db) {
    const order = localDb.getPurchase(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    return res.json(order);
  }

  try {
    const docRef = doc(db, "purchases", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ id: snap.id, ...snap.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign Buyer to Purchase Order
router.patch("/purchases/:id/assign", authenticate, async (req, res) => {
  const user = (req as any).user;
  const { buyer_id, buyer_name, buyer_email } = req.body;

  const targetBuyerId = buyer_id || user.id;
  const targetBuyerName = buyer_name || user.name;
  const targetBuyerEmail = buyer_email || user.email;

  const updates = {
    buyer_id: targetBuyerId,
    buyer_name: targetBuyerName,
    buyer_email: targetBuyerEmail,
    updated_at: new Date().toISOString()
  };

  if (isDummyFirebase || !db) {
    const order = localDb.getPurchase(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    localDb.updatePurchase(order.id, updates);

    if (order.requester_email) {
      sendEmail({
        to: order.requester_email,
        subject: `👤 Comprador Atribuído ao Pedido #${order.numeric_id || order.id}`,
        html: buildPurchaseEmailHtml({
          title: "Comprador Atribuído ao Seu Pedido",
          orderId: order.numeric_id || order.id,
          curso: order.curso,
          turma: order.turma,
          items: order.items,
          status: order.status,
          requesterName: order.requester_name,
          buyerName: targetBuyerName,
          message: `O comprador ${targetBuyerName} assumiu a responsabilidade pelo seu pedido.`
        })
      }).catch(e => console.error("Error sending assign notification to requester:", e));
    }

    return res.json({ success: true, buyer_name: targetBuyerName });
  }

  try {
    const docRef = doc(db, "purchases", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Pedido não encontrado" });

    const orderData = snap.data();
    await updateDoc(docRef, updates);

    if (orderData.requester_email) {
      sendEmail({
        to: orderData.requester_email,
        subject: `👤 Comprador Atribuído ao Pedido #${orderData.numeric_id || orderData.id}`,
        html: buildPurchaseEmailHtml({
          title: "Comprador Atribuído ao Seu Pedido",
          orderId: orderData.numeric_id || orderData.id,
          curso: orderData.curso,
          turma: orderData.turma,
          items: orderData.items,
          status: orderData.status,
          requesterName: orderData.requester_name,
          buyerName: targetBuyerName,
          message: `O comprador ${targetBuyerName} assumiu a responsabilidade pelo seu pedido.`
        })
      }).catch(e => console.error("Error sending assign notification to requester:", e));
    }

    res.json({ success: true, buyer_name: targetBuyerName });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Purchase Status (Ciente, Em Andamento, Concluído, Cancelado)
router.patch("/purchases/:id/status", authenticate, async (req, res) => {
  const { status, fluig_number, notes } = req.body;
  if (!status) return res.status(400).json({ error: "Status é obrigatório." });

  const validStatuses = ["pendente", "ciente", "em_andamento", "concluido", "cancelado"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  const updates: any = {
    status,
    status_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (fluig_number !== undefined) updates.fluig_number = fluig_number;
  if (notes !== undefined) updates.notes = notes;

  if (isDummyFirebase || !db) {
    const order = localDb.getPurchase(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    localDb.updatePurchase(order.id, updates);

    if (order.requester_email) {
      const statusLabels: Record<string, string> = {
        ciente: "Ciente / Pedido Visualizado pelo Comprador",
        em_andamento: "Em Andamento (Cotação / Processamento)",
        concluido: "Concluído / Entregue",
        cancelado: "Cancelado"
      };
      const label = statusLabels[status] || status;

      sendEmail({
        to: order.requester_email,
        subject: `🔄 Atualização de Status: Pedido #${order.numeric_id || order.id} está ${label}`,
        html: buildPurchaseEmailHtml({
          title: `Status do Pedido Atualizado: ${label}`,
          orderId: order.numeric_id || order.id,
          curso: order.curso,
          turma: order.turma,
          items: order.items,
          status,
          requesterName: order.requester_name,
          buyerName: order.buyer_name,
          message: notes || (fluig_number ? `Número Fluig: ${fluig_number}` : undefined)
        })
      }).catch(e => console.error("Error sending status email:", e));
    }

    return res.json({ success: true });
  }

  try {
    const docRef = doc(db, "purchases", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Pedido não encontrado" });

    const orderData = snap.data();
    await updateDoc(docRef, updates);

    if (orderData.requester_email) {
      const statusLabels: Record<string, string> = {
        ciente: "Ciente / Pedido Visualizado pelo Comprador",
        em_andamento: "Em Andamento (Cotação / Processamento)",
        concluido: "Concluído / Entregue",
        cancelado: "Cancelado"
      };
      const label = statusLabels[status] || status;

      sendEmail({
        to: orderData.requester_email,
        subject: `🔄 Atualização de Status: Pedido #${orderData.numeric_id || orderData.id} está ${label}`,
        html: buildPurchaseEmailHtml({
          title: `Status do Pedido Atualizado: ${label}`,
          orderId: orderData.numeric_id || orderData.id,
          curso: orderData.curso,
          turma: orderData.turma,
          items: orderData.items,
          status,
          requesterName: orderData.requester_name,
          buyerName: orderData.buyer_name,
          message: notes || (fluig_number ? `Número Fluig: ${fluig_number}` : undefined)
        })
      }).catch(e => console.error("Error sending status email:", e));
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Purchase Order details/items
router.patch("/purchases/:id/update", authenticate, async (req, res) => {
  const { curso, turma, items, fluig_number, notes } = req.body;
  const updates: any = { updated_at: new Date().toISOString() };

  if (curso) updates.curso = curso;
  if (turma) updates.turma = turma;
  if (fluig_number !== undefined) updates.fluig_number = fluig_number;
  if (notes !== undefined) updates.notes = notes;
  if (Array.isArray(items)) {
    updates.items = items.map((it: any) => ({
      item_id: it.item_id || it.id || "",
      item_name: it.item_name || it.name || "Item sem nome",
      quantity: Number(it.quantity) || 1,
      reason: it.reason || "Não informado",
      is_new_item: !!it.is_new_item,
      new_item_description: it.new_item_description || ""
    }));
  }

  if (isDummyFirebase || !db) {
    const updated = localDb.updatePurchase(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: "Pedido não encontrado" });
    return res.json({ success: true });
  }

  try {
    const docRef = doc(db, "purchases", req.params.id);
    await updateDoc(docRef, updates);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Requester requests status update from Buyer
router.post("/purchases/:id/request-update", authenticate, async (req, res) => {
  const user = (req as any).user;

  if (isDummyFirebase || !db) {
    const order = localDb.getPurchase(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    const recipients = order.buyer_email ? [order.buyer_email] : [];
    if (recipients.length === 0) {
      const rec = await getPurchaseRecipients();
      rec.buyers.forEach(b => { if (b.email) recipients.push(b.email); });
    }

    for (const email of recipients) {
      sendEmail({
        to: email,
        subject: `❓ Solicitante Pede Atualização: Pedido #${order.numeric_id || order.id}`,
        html: buildPurchaseEmailHtml({
          title: "Solicitação de Atualização de Status",
          orderId: order.numeric_id || order.id,
          curso: order.curso,
          turma: order.turma,
          items: order.items,
          status: order.status,
          requesterName: user.name,
          buyerName: order.buyer_name,
          message: `O docente/solicitante ${user.name} solicita uma atualização sobre o andamento deste pedido de compras.`
        })
      }).catch(e => console.error("Error sending update request email:", e));
    }

    return res.json({ success: true, message: "Notificação enviada ao comprador com sucesso." });
  }

  try {
    const docRef = doc(db, "purchases", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Pedido não encontrado" });

    const orderData = snap.data();
    const recipients = orderData.buyer_email ? [orderData.buyer_email] : [];
    if (recipients.length === 0) {
      const rec = await getPurchaseRecipients();
      rec.buyers.forEach(b => { if (b.email) recipients.push(b.email); });
    }

    for (const email of recipients) {
      sendEmail({
        to: email,
        subject: `❓ Solicitante Pede Atualização: Pedido #${orderData.numeric_id || orderData.id}`,
        html: buildPurchaseEmailHtml({
          title: "Solicitação de Atualização de Status",
          orderId: orderData.numeric_id || orderData.id,
          curso: orderData.curso,
          turma: orderData.turma,
          items: orderData.items,
          status: orderData.status,
          requesterName: user.name,
          buyerName: orderData.buyer_name,
          message: `O docente/solicitante ${user.name} solicita uma atualização sobre o andamento deste pedido de compras.`
        })
      }).catch(e => console.error("Error sending update request email:", e));
    }

    res.json({ success: true, message: "Notificação enviada ao comprador com sucesso." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause / Resume Emails for a Purchase Order
router.patch("/purchases/:id/pause-emails", authenticate, async (req, res) => {
  const { email_paused } = req.body;

  if (isDummyFirebase || !db) {
    const updated = localDb.updatePurchase(req.params.id, {
      email_paused: !!email_paused,
      updated_at: new Date().toISOString()
    });
    if (!updated) return res.status(404).json({ error: "Pedido não encontrado" });
    return res.json({ success: true, email_paused: !!email_paused });
  }

  try {
    const docRef = doc(db, "purchases", req.params.id);
    await updateDoc(docRef, {
      email_paused: !!email_paused,
      updated_at: new Date().toISOString()
    });
    res.json({ success: true, email_paused: !!email_paused });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
