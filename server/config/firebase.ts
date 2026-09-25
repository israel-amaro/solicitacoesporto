import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  arrayUnion
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseSenaiItemsFromCSV } from "../../src/lib/csvParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Root directory of solicitacoesporto is two levels up from server/config
const ROOT_DIR = path.resolve(__dirname, "../../");

export interface LocalDBData {
  users: any[];
  tickets: any[];
  comments: any[];
  loans: any[];
  purchases: any[];
  availableItems?: any[];
  availableItemsMeta?: { lastUpdated?: string; updatedBy?: string; totalSenaiItems?: number };
  counters: { tickets: number; purchases?: number };
}

export class LocalDatabase {
  private filePath: string;
  private data: LocalDBData;

  constructor() {
    this.filePath = path.join(ROOT_DIR, "data_store.json");
    this.data = {
      users: [],
      tickets: [],
      comments: [],
      loans: [],
      purchases: [],
      availableItems: [],
      availableItemsMeta: {},
      counters: { tickets: 0, purchases: 0 }
    };
    this.load();
    this.seedAdminIfNeeded();
    this.seedSenaiItemsIfNeeded();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.tickets) this.data.tickets = [];
        if (!this.data.comments) this.data.comments = [];
        if (!this.data.loans) this.data.loans = [];
        if (!this.data.purchases) this.data.purchases = [];
        if (!this.data.availableItems) this.data.availableItems = [];
        if (!this.data.availableItemsMeta) this.data.availableItemsMeta = {};
        if (!this.data.counters) this.data.counters = { tickets: 0, purchases: 0 };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load local DB:", e);
    }
  }

  private seedSenaiItemsIfNeeded() {
    try {
      if (!this.data.availableItems || this.data.availableItems.length === 0) {
        const baseCsvPath = path.join(ROOT_DIR, "Consulta de Itens - Atas e Contratos - Agosto 3(BASE DE DADOS).csv");
        if (fs.existsSync(baseCsvPath)) {
          const buffer = fs.readFileSync(baseCsvPath);
          const senaiItems = parseSenaiItemsFromCSV(buffer);
          if (senaiItems.length > 0) {
            this.data.availableItems = senaiItems;
            this.data.availableItemsMeta = {
              lastUpdated: new Date().toISOString(),
              updatedBy: "Base Inicial (CSV SENAI)",
              totalSenaiItems: senaiItems.length
            };
            this.save();
            console.log(`📦 [LocalDB] Inicializados ${senaiItems.length} itens do SENAI a partir do CSV base.`);
          }
        }
      }
    } catch (err) {
      console.error("Error seeding SENAI items from base CSV:", err);
    }
  }

  getAvailableItems() {
    this.load();
    if (!this.data.availableItems || this.data.availableItems.length === 0) {
      this.seedSenaiItemsIfNeeded();
    }
    return {
      items: this.data.availableItems || [],
      meta: this.data.availableItemsMeta || {}
    };
  }

  setAvailableItems(
    items: any[],
    updatedBy: string = "Sistema",
    mode: "replace" | "merge" = "replace",
    resolveConflicts: "check" | "overwrite" | "ignore" = "check"
  ) {
    this.load();
    const existing = this.data.availableItems || [];

    if (mode === "replace") {
      this.data.availableItems = items;
      this.data.availableItemsMeta = {
        lastUpdated: new Date().toISOString(),
        updatedBy,
        totalSenaiItems: items.length
      };
      this.save();
      return {
        success: true,
        count: items.length,
        meta: this.data.availableItemsMeta,
        message: `Base zerada e ${items.length} novos itens do SENAI importados!`
      };
    }

    const conflicts: any[] = [];
    const newItems: any[] = [];

    const existingMapByCode = new Map<string, any>();
    const existingMapByName = new Map<string, any>();

    for (const item of existing) {
      if (item.codigo) existingMapByCode.set(item.codigo.toString().trim(), item);
      if (item.full_name) existingMapByName.set(item.full_name.toLowerCase().trim(), item);
    }

    for (const incoming of items) {
      const incCode = incoming.codigo ? incoming.codigo.toString().trim() : "";
      const incName = incoming.full_name ? incoming.full_name.toLowerCase().trim() : "";

      const match = (incCode && existingMapByCode.get(incCode)) || (incName && existingMapByName.get(incName));

      if (match) {
        conflicts.push({
          codigo: incoming.codigo || match.codigo,
          existing: match,
          incoming
        });
      } else {
        newItems.push(incoming);
      }
    }

    if (conflicts.length > 0 && resolveConflicts === "check") {
      return {
        hasConflicts: true,
        conflicts,
        newItemsCount: newItems.length,
        totalCsvItems: items.length,
        message: `Foram encontrados ${conflicts.length} conflito(s) com itens já existentes.`
      };
    }

    let finalItems: any[] = [];

    if (resolveConflicts === "overwrite") {
      const conflictCodes = new Set(conflicts.map(c => c.codigo?.toString().trim()));
      const conflictNames = new Set(conflicts.map(c => c.incoming?.full_name?.toLowerCase().trim()));

      const filteredExisting = existing.filter(ex => {
        const exCode = ex.codigo ? ex.codigo.toString().trim() : "";
        const exName = ex.full_name ? ex.full_name.toLowerCase().trim() : "";
        return !conflictCodes.has(exCode) && !conflictNames.has(exName);
      });

      finalItems = [...filteredExisting, ...items];
    } else {
      finalItems = [...existing, ...newItems];
    }

    this.data.availableItems = finalItems;
    this.data.availableItemsMeta = {
      lastUpdated: new Date().toISOString(),
      updatedBy,
      totalSenaiItems: finalItems.length
    };
    this.save();

    return {
      success: true,
      count: finalItems.length,
      conflictsResolved: conflicts.length,
      meta: this.data.availableItemsMeta,
      message: `Itens adicionados/mesclados com sucesso! Total no banco: ${finalItems.length} itens.`
    };
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
    } catch (e) {
      console.error("Failed to save local DB:", e);
    }
  }

  private seedAdminIfNeeded() {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@2026";
    const hasAdmin = this.data.users.some(u => u.email.toLowerCase() === adminEmail.toLowerCase());
    if (!hasAdmin) {
      const hashedPassword = bcrypt.hashSync(adminPassword, 10);
      this.data.users.push({
        id: "local-admin-id",
        name: "Administrador",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        departments: ["TI", "Manutenção", "Limpeza", "Supervisão", "Compras", "ADM"],
        unit: "Todas"
      });
      this.save();
    }
  }

  getUsers() {
    this.load();
    return this.data.users;
  }

  getUser(id: string) {
    this.load();
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string) {
    this.load();
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user: any) {
    this.load();
    const id = "user_" + Math.random().toString(36).substring(2, 11);
    const newUser = { id, ...user };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: any) {
    this.load();
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  deleteUser(id: string) {
    this.load();
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  getTickets() {
    this.load();
    return this.data.tickets;
  }

  getTicket(id: string) {
    this.load();
    return this.data.tickets.find(t => t.id === id || String(t.numeric_id) === String(id));
  }

  addTicket(ticket: any) {
    this.load();
    const id = "ticket_" + Math.random().toString(36).substring(2, 11);
    this.data.counters.tickets = (this.data.counters.tickets || 0) + 1;
    const numeric_id = this.data.counters.tickets;
    const newTicket = { id, numeric_id, ...ticket };
    this.data.tickets.push(newTicket);
    this.save();
    return newTicket;
  }

  updateTicket(id: string, updates: any) {
    this.load();
    const idx = this.data.tickets.findIndex(t => t.id === id || String(t.numeric_id) === String(id));
    if (idx !== -1) {
      this.data.tickets[idx] = { ...this.data.tickets[idx], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  deleteTicket(id: string) {
    this.load();
    const initialLen = this.data.tickets.length;
    this.data.tickets = this.data.tickets.filter(t => t.id !== id && String(t.numeric_id) !== String(id));
    if (this.data.tickets.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  getComments(ticket_id: string) {
    this.load();
    return this.data.comments.filter(c => c.ticket_id === ticket_id);
  }

  addComment(comment: any) {
    this.load();
    const id = "comment_" + Math.random().toString(36).substring(2, 11);
    const newComment = { id, ...comment };
    this.data.comments.push(newComment);
    this.save();
    return newComment;
  }

  getLoans() {
    this.load();
    return this.data.loans;
  }

  getLoan(id: string) {
    this.load();
    return this.data.loans.find(l => l.id === id);
  }

  addLoan(loan: any) {
    this.load();
    const id = "loan_" + Math.random().toString(36).substring(2, 11);
    const newLoan = { id, ...loan };
    this.data.loans.push(newLoan);
    this.save();
    return newLoan;
  }

  updateLoan(id: string, updates: any) {
    this.load();
    const idx = this.data.loans.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.data.loans[idx] = { ...this.data.loans[idx], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  getPurchases() {
    this.load();
    return this.data.purchases || [];
  }

  getPurchase(id: string) {
    this.load();
    return (this.data.purchases || []).find(p => p.id === id || String(p.numeric_id) === String(id));
  }

  addPurchase(purchase: any) {
    this.load();
    if (!this.data.purchases) this.data.purchases = [];
    if (!this.data.counters) this.data.counters = { tickets: 0, purchases: 0 };
    this.data.counters.purchases = ((this.data.counters as any).purchases || 0) + 1;
    const numeric_id = (this.data.counters as any).purchases;
    const id = "purchase_" + Math.random().toString(36).substring(2, 11);
    const newPurchase = { id, numeric_id, ...purchase };
    this.data.purchases.push(newPurchase);
    this.save();
    return newPurchase;
  }

  updatePurchase(id: string, updates: any) {
    this.load();
    if (!this.data.purchases) this.data.purchases = [];
    const idx = this.data.purchases.findIndex(p => p.id === id || String(p.numeric_id) === String(id));
    if (idx !== -1) {
      this.data.purchases[idx] = { ...this.data.purchases[idx], ...updates };
      this.save();
      return true;
    }
    return false;
  }

  deletePurchase(id: string) {
    this.load();
    if (!this.data.purchases) return false;
    const initialLen = this.data.purchases.length;
    this.data.purchases = this.data.purchases.filter(p => p.id !== id && String(p.numeric_id) !== String(id));
    if (this.data.purchases.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const localDb = new LocalDatabase();

// Firebase Configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(ROOT_DIR, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    // VITE_* vars are build-time only on Vercel frontend; server needs FIREBASE_* (no prefix) at runtime.
    // We support both: VITE_* (local dev) and FIREBASE_* (Vercel server-side runtime).
    firebaseConfig = {
      apiKey:
        process.env.FIREBASE_API_KEY ||
        process.env.VITE_FIREBASE_API_KEY ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain:
        process.env.FIREBASE_AUTH_DOMAIN ||
        process.env.VITE_FIREBASE_AUTH_DOMAIN ||
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.VITE_FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId:
        process.env.FIREBASE_MESSAGING_SENDER_ID ||
        process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId:
        process.env.FIREBASE_APP_ID ||
        process.env.VITE_FIREBASE_APP_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
  }
} catch (e) {
  console.error("Error loading Firebase config:", e);
}

export const isDummyFirebase = !firebaseConfig.projectId ||
  firebaseConfig.projectId === "remixed-project-id" ||
  firebaseConfig.projectId === "your-project-id" ||
  firebaseConfig.projectId === "" ||
  firebaseConfig.apiKey === "remixed-api-key" ||
  firebaseConfig.apiKey === "your-api-key";

let dbInstance: any;
try {
  if (firebaseConfig.projectId && !isDummyFirebase) {
    const firebaseApp = initializeApp(firebaseConfig);
    // Do NOT pass firestoreDatabaseId if it's undefined — always use the default database
    dbInstance = firebaseConfig.firestoreDatabaseId
      ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(firebaseApp);
    console.log("Firebase initialized for project:", firebaseConfig.projectId);
  } else {
    console.warn("Firebase Project ID is missing or is dummy. Local Database fallback enabled.");
  }
} catch (e) {
  console.error("Firebase initialization failed, enabling Local Database fallback:", e);
}

export const db = dbInstance;
export {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  arrayUnion
};
