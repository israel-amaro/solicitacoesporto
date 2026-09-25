// --- Shared Constants ---

export const USEFUL_LINKS = [
  {
    title: "Diário de Classe (Pauta e RH)",
    url: "https://portal.findes.org.br/FrameHTML/web/app/Edu/PortalDoProfessor/#/login?autoload=false&ReturnUrl=%2fCorpore.Net%2fMain.aspx%3fActionID%3dEduDiarioClasseActionWeb%26SelectedMenuIDKey%3dmnDiarioClasse",
    user: "Nº de Matrícula",
    desc: "Acesso ao Diário de Classe, pautas e recursos humanos da Findes.",
    category: "Acadêmico"
  },
  {
    title: "Portal EAD Sesi Educação",
    url: "https://ead.sesieducacao.com.br/uc/login?dir=%2Fuc%2F&hash=portal",
    user: "CPF",
    desc: "Cursos previstos no PDI (Plano de Desenvolvimento Individual) e outras formações.",
    category: "Capacitação"
  },
  {
    title: "Horário de Aula",
    url: "https://spe.findes.org.br/",
    user: "CPF",
    desc: "Consulta e acompanhamento do horário de aulas institucional.",
    category: "Acadêmico"
  },
  {
    title: "Plataforma Meu SENAI",
    url: "https://identidade.senai.br/authenticationendpoint/login.do?RelayState=https%3A%2F%2Fmeusenai.senai.br%2F&commonAuthCallerPath=%2Fsamlsso&forceAuth=false&passiveAuth=false&tenantDomain=carbon.super&sessionDataKey=7c08b55c-f8fb-4804-abf4-f2c51a55f589&relyingParty=https%3A%2F%2Fmeusenai.senai.br&type=samlsso&sp=meusenai.senai.br&isSaaSApp=false&authenticators=BasicAuthenticator%3ALOCAL",
    user: "CPF ou E-mail Docente",
    desc: "Acesso à plataforma Meu SENAI e conta Google Educacional (login com o e-mail docente).",
    category: "Acadêmico"
  },
  {
    title: "Metas e Feedback Individual",
    url: "https://portal.findes.org.br",
    user: "E-mail Corporativo",
    desc: "Acesso à plataforma de metas individuais, avaliações e feedback corporativo.",
    category: "Corporativo"
  },
  {
    title: "E-mail Corporativo (Outlook)",
    url: "https://outlook.office.com/mail/",
    user: "E-mail Corporativo",
    desc: "Caixa de entrada oficial do e-mail corporativo (Office 365).",
    category: "Comunicação"
  },
  {
    title: "EAD SENAI-ES (Portal do Aluno)",
    url: "https://ead.senaies.org.br/",
    user: "CPF",
    desc: "Portal para acompanhamento de atividades dos alunos na modalidade EAD.",
    category: "Acadêmico"
  },
  {
    title: "Banco de Questões SAEP (SISBIA)",
    url: "https://sisbia.senai.br",
    user: "E-mail Corporativo",
    desc: "Acesso ao banco de questões padrão para o Sistema de Avaliação da Educação Profissional.",
    category: "Avaliação"
  },
  {
    title: "Itinerário Nacional SENAI",
    url: "https://itinerario.senai.br/",
    user: "Google Educacional",
    desc: "Cursos e conteúdos didáticos do Itinerário Nacional do SENAI.",
    category: "Capacitação"
  },
  {
    title: "Recursos Didáticos SENAI",
    url: "https://recursosdidaticos.senai.br/",
    user: "Google Educacional",
    desc: "Situações de aprendizagem, simuladores, games, apostilas e materiais didáticos diversos.",
    category: "Materiais"
  },
  {
    title: "Conteúdo Online SENAI-ES",
    url: "https://conteudoonline.senai-es.org.br/login",
    user: "Solicitar acesso na própria tela de login",
    desc: "Planos de curso, calendários escolares e formulários operacionais (Atividades, Provas, S.A.s, Planos de Aula/Ensino).",
    category: "Materiais"
  }
];

export const AGENDAMENTO_AMBIENTES_URL = "https://porto-gold-two.vercel.app/agendamento";
export const PAINEL_AULAS_URL = "https://porto-gold-two.vercel.app/";

export const UNIT_LOCATIONS: Record<string, string[]> = {
  'PORTO': [
    "SAL01 - SALA ESTRUTURAR",
    "SAL02 - SALA APRIMORAR",
    "SAL03 - SALA FORTALECER",
    "SAL04 - SALA EXPLORAR",
    "SAL05 - SALA OBSERVAR",
    "SAL06 - SALA COMPREENDER",
    "SAL07 - SALA CONECTAR",
    "SAL08 - SALA INOVAR",
    "SAL09 - SALA INSPIRAR",
    "SAL10 - SALA EVOLUIR",
    "SAL11 - SALA EXPANDIR",
    "SAL12 - SALA CRIAR",
    "SAL13 - SALA PLANEJAR",
    "SAL14 - SALA ORGANIZAR",
    "LAB01 - LAB. PROTOTIPAR",
    "LAB02 - LAB. MOVIMENTAR",
    "LAB03 - LAB. INTEGRAR",
    "LAB04 - LAB. IMPULSIONAR",
    "LAB05 - LAB. VALORIZAR",
    "LAB06 - LAB. TRANSFORMAR",
    "LAB07 - LAB. EXPERIMENTAR",
    "LAB08 - LAB. OTIMIZAR",
    "LAB09 - LAB. VALIDAR",
    "LAB10 - SALA COMPARTILHAR",
    "LAB11 - SALA COLABORAR",
    "SENAI LAB",
    "SALA DE ATENDIMENTO 01",
    "SALA DE ATENDIMENTO 02",
    "ESPAÇO EDUCAR",
    "ESPAÇO COORDENAR",
    "ESPAÇO CONEXÕES",
    "PEDAGÓGICO 1º PAV",
    "PEDAGÓGICO 2º PAV",
    "RECEPÇÃO",
    "ÁREA DE VIVÊNCIA",
    "AUDITÓRIO",
    "BIBLIOTECA",
    "SALA DOS PROFESSORES",
    "SECRETARIA ACADÊMICA",
    "DIREÇÃO / GERÊNCIA",
    "TI / SUPORTE TÉCNICO",
    "ALMOXARIFADO",
    "COPA / REFEITÓRIO",
    "GUARITA / PORTARIA",
    "BANHEIROS (MASCULINO / FEMININO / PCD)",
    "CORREDORES E PÁTIO"
  ]
};

