import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, isDummyFirebase, localDb, collection, getDocs, getDoc, addDoc, doc, updateDoc, deleteDoc, query, where } from "../config/firebase.js";
import { authenticate, isAdmin, JWT_SECRET } from "../middleware/auth.js";

const router = Router();

// Auth: Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (isDummyFirebase) {
    try {
      const user = localDb.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      const token = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        departments: user.departments || [],
        unit: user.unit || "Todas",
        allowed_modules: user.allowed_modules || []
      }, JWT_SECRET);
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departments: user.departments || [],
          unit: user.unit || "Todas",
          allowed_modules: user.allowed_modules || []
        }
      });
    } catch (error: any) {
      console.error("Local login error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (!db) {
    return res.status(500).json({ error: "Banco de dados não inicializado. Verifique as configurações do Firebase." });
  }

  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin";
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@2026";
      const isAdminLogin = (email.toLowerCase() === adminEmail.toLowerCase()) && password === adminPassword;

      if (isAdminLogin) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const newAdmin = await addDoc(usersCol, {
          name: "Administrador",
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
          departments: ["TI", "Manutenção", "ADM"],
          unit: "Todas"
        });
        const token = jwt.sign({
          id: newAdmin.id,
          email: adminEmail,
          role: "admin",
          name: "Administrador",
          departments: ["TI", "Manutenção", "ADM"],
          unit: "Todas",
          allowed_modules: ['chamados', 'compras', 'emprestimos', 'supervisao', 'agendamento', 'painel_aulas', 'users']
        }, JWT_SECRET);
        return res.json({
          token,
          user: {
            id: newAdmin.id,
            name: "Administrador",
            email: adminEmail,
            role: "admin",
            departments: ["TI", "Manutenção", "ADM"],
            unit: "Todas",
            allowed_modules: ['chamados', 'compras', 'emprestimos', 'supervisao', 'agendamento', 'painel_aulas', 'users']
          }
        });
      }
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data();

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign({
      id: userDoc.id,
      email: user.email,
      role: user.role,
      name: user.name,
      departments: user.departments || [user.department] || [],
      unit: user.unit || "Todas",
      allowed_modules: user.allowed_modules || []
    }, JWT_SECRET);

    res.json({
      token,
      user: {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departments: user.departments || [user.department] || [],
        unit: user.unit || "Todas",
        allowed_modules: user.allowed_modules || []
      }
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get current authenticated user profile
router.get("/users/me", authenticate, async (req, res) => {
  const tokenUser = (req as any).user;
  if (!tokenUser) return res.status(401).json({ error: "Não autenticado" });

  if (isDummyFirebase) {
    const u = localDb.getUser(tokenUser.id) || tokenUser;
    return res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departments: u.departments || [],
      unit: u.unit || "Todas",
      allowed_modules: u.allowed_modules || []
    });
  }

  if (!db) {
    return res.json(tokenUser);
  }

  try {
    const userSnap = await getDoc(doc(db, "users", tokenUser.id));
    if (userSnap.exists()) {
      const u = userSnap.data();
      return res.json({
        id: userSnap.id,
        name: u.name,
        email: u.email,
        role: u.role,
        departments: u.departments || [],
        unit: u.unit || "Todas",
        allowed_modules: u.allowed_modules || []
      });
    }
    return res.json(tokenUser);
  } catch (err: any) {
    return res.json(tokenUser);
  }
});

// User: Change Own Password
router.patch("/users/me/password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = (req as any).user;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres" });
  }

  if (isDummyFirebase) {
    try {
      const currentUser = localDb.getUser(user.id) || localDb.getUserByEmail(user.email);
      if (!currentUser) return res.status(404).json({ error: "Usuário não encontrado" });
      if (!bcrypt.compareSync(currentPassword, currentUser.password)) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      localDb.updateUser(currentUser.id, { password: hashedPassword });
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });
  try {
    const userRef = doc(db, "users", user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Usuário não encontrado" });
    const userData = userSnap.data();
    if (!bcrypt.compareSync(currentPassword, userData.password)) {
      return res.status(400).json({ error: "Senha atual incorreta" });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await updateDoc(userRef, { password: hashedPassword });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/debug/users", async (req, res) => {
  if (isDummyFirebase) {
    return res.json(localDb.getUsers());
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: User Management
router.get("/users", authenticate, isAdmin, async (req, res) => {
  if (isDummyFirebase) {
    try {
      const users = localDb.getUsers().map((u: any) => {
        let depts = [];
        if (Array.isArray(u.departments)) {
          depts = u.departments;
        } else if (typeof u.departments === "string") {
          depts = [u.departments];
        }
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          departments: depts,
          unit: u.unit,
          allowed_modules: u.allowed_modules || []
        };
      });
      return res.json(users);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = querySnapshot.docs.map(d => {
      const data = d.data();
      let depts = [];
      if (Array.isArray(data.departments)) {
        depts = data.departments;
      } else if (typeof data.departments === "string") {
        depts = [data.departments];
      } else if (data.department) {
        depts = [data.department];
      }
      return {
        id: d.id,
        name: data.name,
        email: data.email,
        role: data.role,
        departments: depts,
        unit: data.unit,
        allowed_modules: data.allowed_modules || []
      };
    });
    res.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(400).json({ error: error.message });
  }
});

router.post("/users", authenticate, isAdmin, async (req, res) => {
  const { name, email, password, role, departments, unit, allowed_modules } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (isDummyFirebase) {
    try {
      const existing = localDb.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }
      localDb.addUser({
        name,
        email,
        password: hashedPassword,
        role,
        departments: departments || [],
        unit: unit || "Todas",
        allowed_modules: Array.isArray(allowed_modules) ? allowed_modules : []
      });
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });

  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    await addDoc(collection(db, "users"), {
      name,
      email,
      password: hashedPassword,
      role,
      departments: departments || [],
      unit: unit || "Todas",
      allowed_modules: Array.isArray(allowed_modules) ? allowed_modules : []
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Reset any user password
router.patch("/users/:id/reset-password", authenticate, isAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres" });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  if (isDummyFirebase) {
    try {
      const targetUser = localDb.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ error: "Usuário não encontrado" });
      localDb.updateUser(req.params.id, { password: hashedPassword });
      return res.json({ success: true, message: `Senha do usuário ${targetUser.name} redefinida com sucesso` });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });
  try {
    const userRef = doc(db, "users", req.params.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Usuário não encontrado" });
    await updateDoc(userRef, { password: hashedPassword });
    res.json({ success: true, message: "Senha redefinida com sucesso" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/users/:id", authenticate, isAdmin, async (req, res) => {
  if (isDummyFirebase) {
    try {
      const deleted = localDb.deleteUser(req.params.id);
      if (deleted) {
        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });
  try {
    await deleteDoc(doc(db, "users", req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Edit User Profile
router.patch("/users/:id", authenticate, isAdmin, async (req, res) => {
  const { name, email, password, role, departments, unit, allowed_modules } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (departments !== undefined) updateData.departments = Array.isArray(departments) ? departments : [departments];
  if (allowed_modules !== undefined) updateData.allowed_modules = Array.isArray(allowed_modules) ? allowed_modules : [allowed_modules];
  if (unit !== undefined) updateData.unit = unit;
  if (password && password.trim().length >= 4) {
    updateData.password = bcrypt.hashSync(password, 10);
  }

  if (isDummyFirebase) {
    try {
      const user = localDb.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
      localDb.updateUser(req.params.id, updateData);
      return res.json({ success: true, user: { ...user, ...updateData } });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (!db) return res.status(500).json({ error: "Banco de dados não inicializado" });
  try {
    const userRef = doc(db, "users", req.params.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ error: "Usuário não encontrado" });
    await updateDoc(userRef, updateData);
    res.json({ success: true, message: "Usuário atualizado com sucesso" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
