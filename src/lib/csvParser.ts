export interface SenaiItem {
  id: string;
  codigo: string;
  contrato: string;
  entidade: string;
  fornecedor: string;
  nome_fantasia: string;
  descricao: string;
  full_name: string;
  search_key: string;
}

export function parseSenaiItemsFromCSV(data: string | Uint8Array): SenaiItem[] {
  let content = '';
  
  if (typeof data === 'string') {
    content = data;
  } else if (data instanceof Uint8Array) {
    // Try decoding latin1 (ISO-8859-1) for Portuguese accents
    const decoderLatin1 = new TextDecoder('iso-8859-1');
    const decoderUtf8 = new TextDecoder('utf-8');
    const utf8Attempt = decoderUtf8.decode(data);

    if (!utf8Attempt.includes('\uFFFD') && utf8Attempt.includes(';')) {
      content = utf8Attempt;
    } else {
      content = decoderLatin1.decode(data);
    }
  }

  const lines = content.split(/\r?\n/);
  const rawItems: SenaiItem[] = [];

  let headerIdx = -1;
  let delimiter = ';';
  let colEntidade = 3;
  let colCodigo = 1;
  let colContrato = 2;
  let colFornecedor = 5;
  let colNome = 9;
  let colDesc = 10;

  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const semiCount = (line.match(/;/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const currDelim = semiCount >= commaCount ? ';' : ',';

    const parts = line.split(currDelim).map(p => p.trim().replace(/^"+|"+$/g, ''));
    const entIndex = parts.findIndex(p => p.toUpperCase().includes('ENTIDADE'));

    if (entIndex !== -1) {
      headerIdx = i;
      delimiter = currDelim;
      colEntidade = entIndex;
      const cod = parts.findIndex(p => p.toUpperCase().includes('COD') || p.toUpperCase().includes('CÓD'));
      if (cod !== -1) colCodigo = cod;
      const cont = parts.findIndex(p => p.toUpperCase().includes('CONTRATO'));
      if (cont !== -1) colContrato = cont;
      const forn = parts.findIndex(p => p.toUpperCase().includes('FORNECEDOR'));
      if (forn !== -1) colFornecedor = forn;
      const nom = parts.findIndex(p => p.toUpperCase().includes('NOME FANTASIA'));
      if (nom !== -1) colNome = nom;
      const desc = parts.findIndex(p => p.toUpperCase().includes('DESC'));
      if (desc !== -1) colDesc = desc;
      break;
    }
  }

  const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map(p => p.trim().replace(/^"+|"+$/g, ''));

    // FILTER: Only SENAI items
    const entidade = (parts[colEntidade] || '').toUpperCase();
    const isSenai = entidade.includes('SENAI') || parts.some(p => p.toUpperCase().startsWith('SENAI-'));

    if (isSenai) {
      const codigo = parts[colCodigo] || '';
      const contrato = parts[colContrato] || '';
      const fornecedor = parts[colFornecedor] || '';
      const nomeFantasia = parts[colNome] || '';
      const descricao = parts[colDesc] || nomeFantasia;

      const itemText = (descricao || nomeFantasia).trim();
      if (!itemText) continue;

      const fullName = codigo ? `[${codigo}] ${itemText}` : itemText;

      rawItems.push({
        id: codigo || `item_${rawItems.length + 1}`,
        codigo,
        contrato,
        entidade: parts[colEntidade] || 'SENAI',
        fornecedor,
        nome_fantasia: nomeFantasia,
        descricao: itemText,
        full_name: fullName,
        search_key: `${codigo} ${itemText} ${fornecedor} ${contrato}`.toLowerCase()
      });
    }
  }

  // Deduplicate by full_name
  const uniqueMap = new Map<string, SenaiItem>();
  rawItems.forEach(it => {
    if (!uniqueMap.has(it.full_name)) {
      uniqueMap.set(it.full_name, it);
    }
  });

  return Array.from(uniqueMap.values());
}
