import { Router } from "express";
import { db, isDummyFirebase, localDb, collection, getDocs, getDoc, addDoc, doc, updateDoc, deleteDoc, query, where, runTransaction } from "../config/firebase.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { notifyNewTicket, notifyRequesterTicketOpened, notifyTicketUpdateToRequester } from "../services/emailService.js";

const router = Router();

// Create ticket (Public)
router.post("/tickets", async (req, res) => {
  const { 
    requester_name, 
    email, 
    requester_email, 
    department, 
    unit, 
    room, 
    location, 
    category, 
    description, 
    reason, 
    equipment, 
    priority, 
    urgent_explanation, 
    registration, 
    phone, 
    attachments, 
    evidenceUrls, 
    evidencePaths 
  } = req.body;

  const finalEmail = (email || requester_email || "").trim();
  const finalName = (requester_name || "").trim();
  const finalLocation = (location || room || "").trim();
  const finalUnit = (unit || department || "PORTO").trim();
  const finalDescription = (description || reason || equipment || "Sem descrição").trim();

  if (!finalName || !finalEmail || !finalLocation || !finalDescription) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios (Nome, E-mail, Local e Descrição)." });
  }

  const newTicketData = {
    requester_name: finalName,
    requester_email: finalEmail,
    email: finalEmail,
    department: finalUnit,
    unit: finalUnit,
    room: finalLocation,
    location: finalLocation,
    category: category || "Outros",
    description: finalDescription,
    reason: reason || finalDescription,
    equipment: equipment || "",
    registration: registration || "",
    phone: phone || "",
    priority: priority || "baixo",
    urgent_explanation: urgent_explanation || "",
    evidenceUrls: evidenceUrls || attachments || [],
    evidencePaths: evidencePaths || [],
    status: "aberto",
    assigned_to: null,
    technician_name: null,
    total_time_ms: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isDummyFirebase) {
    try {
      const ticket = localDb.addTicket(newTicketData);
      
      // Disparar notificações por e-mail (Assíncrono)
      notifyNewTicket(ticket);              // → dluiz@findes.org.br
      notifyRequesterTicketOpened(ticket);  // → solicitante (confirmação de abertura)

      return res.json(ticket);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const counterRef = doc(db, "counters", "tickets");
    let numeric_id = 20;

    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          numeric_id = 20;
          transaction.set(counterRef, { current: 20 });
        } else {
          const currentCount = counterDoc.data()?.current;
          if (typeof currentCount === 'number' && currentCount >= 19) {
            numeric_id = currentCount + 1;
          } else {
            numeric_id = 20;
          }
          transaction.update(counterRef, { current: numeric_id });
        }
      });
    } catch (txError) {
      console.error("⚠️ Transação de contador falhou, calculando numeric_id máximo existente:", txError);
      try {
        const snap = await getDocs(collection(db, "tickets"));
        let maxId = 19;
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data && typeof data.numeric_id === 'number' && data.numeric_id > maxId) {
            maxId = data.numeric_id;
          }
        });
        numeric_id = maxId + 1;
      } catch (fallbackError) {
        numeric_id = 20;
      }
    }

    const fullTicket = {
      numeric_id,
      ...newTicketData
    };

    const docRef = await addDoc(collection(db, "tickets"), fullTicket);
    const createdTicket = { id: docRef.id, ...fullTicket };

    // Disparar notificações por e-mail (Assíncrono)
    notifyNewTicket(createdTicket);              // → dluiz@findes.org.br
    notifyRequesterTicketOpened(createdTicket);  // → solicitante (confirmação de abertura)

    res.json(createdTicket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track ticket by ID or Numeric ID (Public)
router.get("/tickets/track/:id", async (req, res) => {
  const paramId = req.params.id;

  if (isDummyFirebase) {
    const ticket = localDb.getTicket(paramId);
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado." });
    const comments = localDb.getComments(ticket.id);
    return res.json({ ticket, comments });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    let ticketDoc;
    if (!isNaN(Number(paramId))) {
      const q = query(collection(db, "tickets"), where("numeric_id", "==", Number(paramId)));
      const snap = await getDocs(q);
      if (!snap.empty) ticketDoc = snap.docs[0];
    }

    if (!ticketDoc) {
      const docRef = doc(db, "tickets", paramId);
      const snap = await getDoc(docRef);
      if (snap.exists()) ticketDoc = snap;
    }

    if (!ticketDoc) return res.status(404).json({ error: "Chamado não encontrado." });

    const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
    const commentsQ = query(collection(db, "comments"), where("ticket_id", "==", ticket.id));
    const commentsSnap = await getDocs(commentsQ);
    const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ ticket, comments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Public Tickets (Summarized list for transparency board)
router.get("/tickets/public", async (req, res) => {
  if (isDummyFirebase) {
    const tickets = localDb.getTickets().map(t => ({
      id: t.id,
      numeric_id: t.numeric_id,
      department: t.department || t.unit,
      room: t.room || t.location,
      category: t.category,
      status: t.status,
      priority: t.priority,
      created_at: t.created_at
    }));
    return res.json(tickets);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const snap = await getDocs(collection(db, "tickets"));
    const tickets = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        numeric_id: data.numeric_id,
        department: data.department || data.unit,
        room: data.room || data.location,
        category: data.category,
        status: data.status,
        priority: data.priority,
        created_at: data.created_at
      };
    });
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tickets (Auth required)
router.get("/tickets", authenticate, async (req, res) => {
  const user = (req as any).user;

  if (isDummyFirebase) {
    let tickets = localDb.getTickets();
    if (user.role !== "admin") {
      const userDepts = user.departments || [user.department] || [];
      if (userDepts.length > 0 && !userDepts.includes("Todas")) {
        tickets = tickets.filter(t => userDepts.includes(t.department || t.unit));
      }
    }
    return res.json(tickets);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const snap = await getDocs(collection(db, "tickets"));
    let tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (user.role !== "admin") {
      const userDepts = user.departments || [user.department] || [];
      if (userDepts.length > 0 && !userDepts.includes("Todas")) {
        tickets = tickets.filter((t: any) => userDepts.includes(t.department || t.unit));
      }
    }

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get ticket details by ID (Auth required)
router.get("/tickets/:id", authenticate, async (req, res) => {
  if (isDummyFirebase) {
    const ticket = localDb.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });
    return res.json(ticket);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    let ticketSnap;
    if (!isNaN(Number(req.params.id))) {
      const q = query(collection(db, "tickets"), where("numeric_id", "==", Number(req.params.id)));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) ticketSnap = qSnap.docs[0];
    }

    if (!ticketSnap) {
      const docRef = doc(db, "tickets", req.params.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) ticketSnap = snap;
    }

    if (!ticketSnap) return res.status(404).json({ error: "Chamado não encontrado" });
    res.json({ id: ticketSnap.id, ...ticketSnap.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket status
router.patch("/tickets/:id/status", authenticate, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status não informado" });

  if (isDummyFirebase) {
    const ticket = localDb.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

    const oldStatus = ticket.status;
    localDb.updateTicket(req.params.id, {
      status,
      updated_at: new Date().toISOString()
    });

    ticket.status = status;
    notifyTicketUpdateToRequester(ticket, { type: 'status', oldVal: oldStatus, newVal: status });

    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "tickets", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Chamado não encontrado" });

    const ticket: any = { id: snap.id, ...snap.data() };
    const oldStatus = ticket.status;

    await updateDoc(docRef, {
      status,
      updated_at: new Date().toISOString()
    });

    ticket.status = status;
    notifyTicketUpdateToRequester(ticket, { type: 'status', oldVal: oldStatus, newVal: status });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign ticket
router.patch("/tickets/:id/assign", authenticate, async (req, res) => {
  const { assigned_to, technician_id, technician_name } = req.body;
  const user = (req as any).user;

  const targetAssignee = assigned_to || technician_id || user?.id;
  const targetTechName = technician_name || user?.name || "Técnico";

  if (isDummyFirebase) {
    const ticket = localDb.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

    localDb.updateTicket(req.params.id, {
      assigned_to: targetAssignee,
      technician_name: targetTechName,
      status: ticket.status === 'aberto' ? 'em_atendimento' : ticket.status,
      updated_at: new Date().toISOString()
    });

    ticket.assigned_to = targetAssignee;
    ticket.technician_name = targetTechName;
    if (ticket.status === 'aberto') ticket.status = 'em_atendimento';

    notifyTicketUpdateToRequester(ticket, { type: 'assigned', newVal: targetTechName });

    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "tickets", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Chamado não encontrado" });

    const ticket: any = { id: snap.id, ...snap.data() };
    const newStatus = ticket.status === 'aberto' ? 'em_atendimento' : ticket.status;

    await updateDoc(docRef, {
      assigned_to: targetAssignee,
      technician_name: targetTechName,
      status: newStatus,
      updated_at: new Date().toISOString()
    });

    ticket.assigned_to = targetAssignee;
    ticket.technician_name = targetTechName;
    ticket.status = newStatus;

    notifyTicketUpdateToRequester(ticket, { type: 'assigned', newVal: targetTechName });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket priority
router.patch("/tickets/:id/priority", authenticate, async (req, res) => {
  const { priority } = req.body;
  if (!priority) return res.status(400).json({ error: "Prioridade não informada" });

  if (isDummyFirebase) {
    const ticket = localDb.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Chamado não encontrado" });

    const oldPriority = ticket.priority;
    localDb.updateTicket(req.params.id, {
      priority,
      updated_at: new Date().toISOString()
    });

    ticket.priority = priority;
    notifyTicketUpdateToRequester(ticket, { type: 'priority', oldVal: oldPriority, newVal: priority });

    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "tickets", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Chamado não encontrado" });

    const ticket: any = { id: snap.id, ...snap.data() };
    const oldPriority = ticket.priority;

    await updateDoc(docRef, {
      priority,
      updated_at: new Date().toISOString()
    });

    ticket.priority = priority;
    notifyTicketUpdateToRequester(ticket, { type: 'priority', oldVal: oldPriority, newVal: priority });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ticket comments
router.get("/tickets/:id/comments", authenticate, async (req, res) => {
  if (isDummyFirebase) {
    const comments = localDb.getComments(req.params.id);
    return res.json(comments);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const q = query(collection(db, "comments"), where("ticket_id", "==", req.params.id));
    const snap = await getDocs(q);
    const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tickets/:id/comments", authenticate, async (req, res) => {
  const { content, message, is_internal } = req.body;
  const user = (req as any).user;
  const commentText = (content || message || "").trim();

  if (!commentText) return res.status(400).json({ error: "Conteúdo não informado" });

  const commentData = {
    ticket_id: req.params.id,
    author_id: user.id,
    author_name: user.name,
    author_role: user.role,
    content: commentText,
    is_internal: is_internal || false,
    created_at: new Date().toISOString()
  };

  if (isDummyFirebase) {
    const comment = localDb.addComment(commentData);
    const ticket = localDb.getTicket(req.params.id);
    if (ticket && !is_internal) {
      notifyTicketUpdateToRequester(ticket, { type: 'comment', commentText: commentText, authorName: user.name, isInternal: false });
    }
    return res.json(comment);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = await addDoc(collection(db, "comments"), commentData);
    const comment = { id: docRef.id, ...commentData };

    const ticketSnap = await getDoc(doc(db, "tickets", req.params.id));
    if (ticketSnap.exists() && !is_internal) {
      const ticket: any = { id: ticketSnap.id, ...ticketSnap.data() };
      notifyTicketUpdateToRequester(ticket, { type: 'comment', commentText: commentText, authorName: user.name, isInternal: false });
    }

    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ticket (Admin)
router.delete("/tickets/:id", authenticate, isAdmin, async (req, res) => {
  if (isDummyFirebase) {
    const deleted = localDb.deleteTicket(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Chamado não encontrado" });
    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    await deleteDoc(doc(db, "tickets", req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
