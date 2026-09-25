import { Router } from "express";
import { db, isDummyFirebase, localDb, collection, getDocs, getDoc, addDoc, doc, updateDoc, query, where } from "../config/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { notifyManagerAboutNewLoan, notifyUserAboutAuthorization } from "../services/emailService.js";

const router = Router();

// Create loan request (Public)
router.post("/loans", async (req, res) => {
  const { requester_name, registration, email, phone, equipment, location, reason, terms } = req.body;
  if (!requester_name || !registration || !email || !equipment || !location || !reason) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  const newLoanData = {
    requester_name,
    registration,
    email,
    phone: phone || "",
    equipment,
    location,
    reason,
    terms: terms || "",
    status: "pendente_autorizacao",
    pin,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isDummyFirebase) {
    try {
      const loan = localDb.addLoan(newLoanData);
      notifyManagerAboutNewLoan(loan);
      return res.json(loan);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = await addDoc(collection(db, "loans"), newLoanData);
    const loan = { id: docRef.id, ...newLoanData };
    notifyManagerAboutNewLoan(loan);
    res.json(loan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track loan by ID (Public)
router.get("/loans/track/:id", async (req, res) => {
  if (isDummyFirebase) {
    const loan = localDb.getLoan(req.params.id);
    if (!loan) return res.status(404).json({ error: "Empréstimo não encontrado." });
    return res.json(loan);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "loans", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Empréstimo não encontrado." });
    res.json({ id: snap.id, ...snap.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track loans by registration (Public)
router.get("/loans/registration/:registration", async (req, res) => {
  const { registration } = req.params;

  if (isDummyFirebase) {
    const loans = localDb.getLoans().filter(l => String(l.registration).trim() === String(registration).trim());
    return res.json(loans);
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const q = query(collection(db, "loans"), where("registration", "==", registration.trim()));
    const snap = await getDocs(q);
    const loans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(loans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all loans (Auth required)
router.get("/loans", authenticate, async (req, res) => {
  if (isDummyFirebase) {
    return res.json(localDb.getLoans());
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const snap = await getDocs(collection(db, "loans"));
    const loans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(loans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Authorize loan (Manager/Admin)
router.patch("/loans/:id/authorize", authenticate, async (req, res) => {
  const { terms } = req.body;

  if (isDummyFirebase) {
    const loan = localDb.getLoan(req.params.id);
    if (!loan) return res.status(404).json({ error: "Empréstimo não encontrado" });

    const updates = {
      status: "autorizado",
      terms: terms || loan.terms || "",
      authorized_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.updateLoan(req.params.id, updates);
    const updatedLoan = { ...loan, ...updates };
    notifyUserAboutAuthorization(updatedLoan);
    return res.json({ success: true, loan: updatedLoan });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "loans", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Empréstimo não encontrado" });

    const loanData = snap.data();
    const updates = {
      status: "autorizado",
      terms: terms || loanData.terms || "",
      authorized_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await updateDoc(docRef, updates);
    const updatedLoan = { id: snap.id, ...loanData, ...updates };
    notifyUserAboutAuthorization(updatedLoan);
    res.json({ success: true, loan: updatedLoan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject loan
router.patch("/loans/:id/reject", authenticate, async (req, res) => {
  const { reason } = req.body;

  if (isDummyFirebase) {
    const updated = localDb.updateLoan(req.params.id, {
      status: "reprovado",
      rejection_reason: reason || "",
      updated_at: new Date().toISOString()
    });
    if (!updated) return res.status(404).json({ error: "Empréstimo não encontrado" });
    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "loans", req.params.id);
    await updateDoc(docRef, {
      status: "reprovado",
      rejection_reason: reason || "",
      updated_at: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Release equipment with PIN & initial checklist
router.post("/loans/:id/release", async (req, res) => {
  const { pin, signature, checklist } = req.body;

  if (isDummyFirebase) {
    const loan = localDb.getLoan(req.params.id);
    if (!loan) return res.status(404).json({ error: "Empréstimo não encontrado" });
    if (loan.pin !== pin) return res.status(400).json({ error: "PIN incorreto" });

    const updates = {
      status: "em_uso",
      pickup_signature: signature,
      initial_checklist: checklist,
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.updateLoan(req.params.id, updates);
    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "loans", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Empréstimo não encontrado" });

    const loan = snap.data();
    if (loan.pin !== pin) return res.status(400).json({ error: "PIN incorreto" });

    await updateDoc(docRef, {
      status: "em_uso",
      pickup_signature: signature,
      initial_checklist: checklist,
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Return equipment with return checklist & signature
router.post("/loans/:id/return", async (req, res) => {
  const { signature, checklist, is_damaged, damage_notes } = req.body;

  if (isDummyFirebase) {
    const loan = localDb.getLoan(req.params.id);
    if (!loan) return res.status(404).json({ error: "Empréstimo não encontrado" });

    const updates = {
      status: "devolvido",
      return_signature: signature,
      return_checklist: checklist,
      is_damaged: !!is_damaged,
      damage_notes: damage_notes || "",
      returned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.updateLoan(req.params.id, updates);
    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "loans", req.params.id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return res.status(404).json({ error: "Empréstimo não encontrado" });

    await updateDoc(docRef, {
      status: "devolvido",
      return_signature: signature,
      return_checklist: checklist,
      is_damaged: !!is_damaged,
      damage_notes: damage_notes || "",
      returned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Complete loan (Final verification by Admin/Manager)
router.patch("/loans/:id/complete", authenticate, async (req, res) => {
  if (isDummyFirebase) {
    const updated = localDb.updateLoan(req.params.id, {
      status: "finalizado",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (!updated) return res.status(404).json({ error: "Empréstimo não encontrado" });
    return res.json({ success: true });
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const docRef = doc(db, "loans", req.params.id);
    await updateDoc(docRef, {
      status: "finalizado",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
