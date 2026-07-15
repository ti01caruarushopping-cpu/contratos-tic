/**
 * code.gs — API REST para Sistema de Gestão de Contratos de TI
 * Backend: Google Apps Script + Google Sheets
 * Suporta: GET, POST, PUT, DELETE via doGet / doPost
 *
 * INSTALAÇÃO:
 *  1. Cole este código no Apps Script da sua planilha
 *  2. Execute a função setup() para criar todas as abas
 *  3. Publique como Web App (Executar como: Eu | Acesso: Qualquer pessoa)
 *  4. Copie a URL e cole nas Configurações do sistema
 */

// ── ID DA PLANILHA ────────────────────────────────────────
// Deixe em branco para usar a planilha vinculada ao script.
// Ou preencha com o ID de outra planilha.
const SPREADSHEET_ID = '';

// ── NOMES DAS ABAS ────────────────────────────────────────
const SHEETS = {
  CONTRATOS:     'CONTRATOS',
  MOVIMENTACOES: 'MOVIMENTACOES',
  FORNECEDORES:  'FORNECEDORES',
  USUARIOS:      'USUARIOS',
  CONFIGURACOES: 'CONFIGURACOES',
  AUDITORIA:     'AUDITORIA',
};

// ── CABEÇALHOS ────────────────────────────────────────────
const HEADERS = {
  CONTRATOS: [
    'id','empresa','fornecedor','descricao','categoria','centro_custo',
    'responsavel','valor_mensal','valor_anual','tipo','data_inicio',
    'data_fim','dia_vencimento','status','observacoes','data_cadastro',
  ],
  MOVIMENTACOES: [
    'id_movimento','id_contrato','mes','ano','valor_nota','numero_nf',
    'numero_boleto','data_emissao_nf','data_recebimento_nf',
    'data_recebimento_boleto','data_envio_financeiro','data_vencimento',
    'data_pagamento','status','observacoes','usuario',
  ],
  FORNECEDORES: [
    'id_fornecedor','empresa','cnpj','contato','telefone','email',
    'categoria','status',
  ],
  USUARIOS: [
    'id_usuario','nome','email','perfil','status',
  ],
  CONFIGURACOES: [
    'chave','valor',
  ],
  AUDITORIA: [
    'timestamp','usuario','acao','entidade','id_entidade','detalhes',
  ],
};

// ══════════════════════════════════════════════════════════
// ENTRY POINTS
// ══════════════════════════════════════════════════════════

/**
 * Trata requisições GET — usado apenas para testes manuais via navegador.
 * Ex: ?action=getDashboard
 * O frontend não usa doGet (usa POST para evitar preflight CORS).
 */
function doGet(e) {
  return _handleRequest(e, 'GET');
}

/**
 * Trata requisições POST.
 * O frontend envia TODAS as ações (get/post/put/delete) via POST
 * com Content-Type: text/plain, para evitar o preflight OPTIONS
 * que o Apps Script não responde (causa de erro de CORS).
 * A ação real e os dados vêm dentro do corpo JSON.
 */
function doPost(e) {
  return _handleRequest(e, 'POST');
}

function _handleRequest(e, httpMethod) {
  try {
    // Body sempre tem prioridade — é onde o frontend envia tudo via POST.
    // params (querystring) só é usado em testes manuais via doGet no navegador.
    const body   = _parseBody(e);
    const params = Object.keys(body).length ? body : (e.parameter || {});
    const action = params.action || '';

    // Log de acesso
    _audit(params.usuario || 'sistema', action, httpMethod, '');

    let result;
    switch (action) {

      // CONTRATOS
      case 'getContratos':     result = getContratos(params);       break;
      case 'getContrato':      result = getContrato(params.id);     break;
      case 'postContrato':     result = postContrato(params);       break;
      case 'putContrato':      result = putContrato(params);        break;
      case 'deleteContrato':   result = deleteContrato(params.id);  break;

      // MOVIMENTAÇÕES
      case 'getMovimentacoes':   result = getMovimentacoes(params);                 break;
      case 'postMovimentacao':   result = postMovimentacao(params);                 break;
      case 'putMovimentacao':    result = putMovimentacao(params);                  break;
      case 'deleteMovimentacao': result = deleteMovimentacao(params.id_movimento);  break;

      // FORNECEDORES
      case 'getFornecedores':   result = getFornecedores();              break;
      case 'postFornecedor':    result = postFornecedor(params);         break;
      case 'putFornecedor':     result = putFornecedor(params);          break;
      case 'deleteFornecedor':  result = deleteFornecedor(params.id_fornecedor); break;

      // DASHBOARD
      case 'getDashboard': result = getDashboard(); break;

      // SETUP
      case 'setup': result = setup(); break;

      default:
        result = { error: `Ação desconhecida: "${action}"` };
    }

    return _jsonResponse(result);

  } catch (err) {
    Logger.log('ERRO: ' + err.message + '\n' + err.stack);
    return _jsonResponse({ error: err.message });
  }
}


// ══════════════════════════════════════════════════════════
// CONTRATOS
// ══════════════════════════════════════════════════════════

function getContratos(params) {
  const rows = _readAll(SHEETS.CONTRATOS);
  let data   = rows.map(_rowToObj.bind(null, HEADERS.CONTRATOS));

  if (params.status)      data = data.filter(r => r.status      === params.status);
  if (params.empresa)     data = data.filter(r => r.empresa     === params.empresa);
  if (params.categoria)   data = data.filter(r => r.categoria   === params.categoria);
  if (params.fornecedor)  data = data.filter(r => r.fornecedor?.toLowerCase().includes(params.fornecedor.toLowerCase()));
  if (params.centro_custo)data = data.filter(r => r.centro_custo=== params.centro_custo);

  return { contratos: data };
}

function getContrato(id) {
  if (!id) return { error: 'ID obrigatório' };
  const row = _findRow(SHEETS.CONTRATOS, 'id', id);
  if (!row) return { contrato: null };
  return { contrato: _rowToObj(HEADERS.CONTRATOS, row) };
}

function postContrato(body) {
  _validateRequired(body, ['empresa','fornecedor','descricao','categoria','responsavel']);
  const id = _generateId('C', SHEETS.CONTRATOS, 'id');
  body.id            = id;
  body.data_cadastro = _now();
  body.valor_anual   = body.valor_anual || (parseFloat(body.valor_mensal || 0) * 12);

  _appendRow(SHEETS.CONTRATOS, HEADERS.CONTRATOS, body);
  _audit(body.responsavel, 'CREATE', 'CONTRATO', id);
  return { success: true, id };
}

function putContrato(body) {
  if (!body.id) return { error: 'ID obrigatório para atualizar' };
  _validateRequired(body, ['id']);
  const updated = _updateRow(SHEETS.CONTRATOS, 'id', body.id, HEADERS.CONTRATOS, body);
  if (!updated) return { error: 'Contrato não encontrado: ' + body.id };
  _audit(body.responsavel || 'sistema', 'UPDATE', 'CONTRATO', body.id);
  return { success: true };
}

function deleteContrato(id) {
  if (!id) return { error: 'ID obrigatório' };
  const deleted = _deleteRow(SHEETS.CONTRATOS, 'id', id);
  if (!deleted) return { error: 'Contrato não encontrado: ' + id };
  // Excluir movimentações associadas
  _deleteAllWhere(SHEETS.MOVIMENTACOES, 'id_contrato', id);
  _audit('sistema', 'DELETE', 'CONTRATO', id);
  return { success: true };
}

// ══════════════════════════════════════════════════════════
// MOVIMENTAÇÕES
// ══════════════════════════════════════════════════════════

function getMovimentacoes(params) {
  const rows = _readAll(SHEETS.MOVIMENTACOES);
  let data   = rows.map(_rowToObj.bind(null, HEADERS.MOVIMENTACOES));

  if (params.id_contrato) data = data.filter(r => r.id_contrato === params.id_contrato);
  if (params.mes)         data = data.filter(r => String(r.mes) === String(params.mes));
  if (params.ano)         data = data.filter(r => String(r.ano) === String(params.ano));
  if (params.status)      data = data.filter(r => r.status      === params.status);

  return { movimentacoes: data };
}

function postMovimentacao(body) {
  _validateRequired(body, ['id_contrato','mes','ano','valor_nota']);
  const id = _generateId('M', SHEETS.MOVIMENTACOES, 'id_movimento');
  body.id_movimento = id;
  _appendRow(SHEETS.MOVIMENTACOES, HEADERS.MOVIMENTACOES, body);
  _audit(body.usuario || 'sistema', 'CREATE', 'MOVIMENTACAO', id);
  return { success: true, id_movimento: id };
}

function putMovimentacao(body) {
  if (!body.id_movimento) return { error: 'id_movimento obrigatório' };
  const updated = _updateRow(SHEETS.MOVIMENTACOES, 'id_movimento', body.id_movimento, HEADERS.MOVIMENTACOES, body);
  if (!updated) return { error: 'Movimentação não encontrada' };
  _audit(body.usuario || 'sistema', 'UPDATE', 'MOVIMENTACAO', body.id_movimento);
  return { success: true };
}

function deleteMovimentacao(id) {
  if (!id) return { error: 'id_movimento obrigatório' };
  const deleted = _deleteRow(SHEETS.MOVIMENTACOES, 'id_movimento', id);
  _audit('sistema', 'DELETE', 'MOVIMENTACAO', id);
  return { success: !!deleted };
}

// ══════════════════════════════════════════════════════════
// FORNECEDORES
// ══════════════════════════════════════════════════════════

function getFornecedores() {
  const rows = _readAll(SHEETS.FORNECEDORES);
  return { fornecedores: rows.map(_rowToObj.bind(null, HEADERS.FORNECEDORES)) };
}

function postFornecedor(body) {
  _validateRequired(body, ['empresa','categoria']);
  const id = _generateId('F', SHEETS.FORNECEDORES, 'id_fornecedor');
  body.id_fornecedor = id;
  _appendRow(SHEETS.FORNECEDORES, HEADERS.FORNECEDORES, body);
  return { success: true, id_fornecedor: id };
}

function putFornecedor(body) {
  if (!body.id_fornecedor) return { error: 'id_fornecedor obrigatório' };
  const updated = _updateRow(SHEETS.FORNECEDORES, 'id_fornecedor', body.id_fornecedor, HEADERS.FORNECEDORES, body);
  return { success: !!updated };
}

function deleteFornecedor(id) {
  if (!id) return { error: 'id_fornecedor obrigatório' };
  _deleteRow(SHEETS.FORNECEDORES, 'id_fornecedor', id);
  return { success: true };
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════

function getDashboard() {
  const hoje   = new Date();
  const contratos   = _readAll(SHEETS.CONTRATOS).map(_rowToObj.bind(null, HEADERS.CONTRATOS));
  const movimentos  = _readAll(SHEETS.MOVIMENTACOES).map(_rowToObj.bind(null, HEADERS.MOVIMENTACOES));
  const fornecedores= _readAll(SHEETS.FORNECEDORES).map(_rowToObj.bind(null, HEADERS.FORNECEDORES));

  const ativos      = contratos.filter(c => c.status === 'Ativo');
  const vencidos    = ativos.filter(c => c.data_fim && new Date(c.data_fim) < hoje);
  const vencendo30  = ativos.filter(c => {
    if (!c.data_fim) return false;
    const diff = (new Date(c.data_fim) - hoje) / 86400000;
    return diff >= 0 && diff <= 30;
  });

  const valorMensal = ativos.reduce((s,c) => s + (parseFloat(c.valor_mensal) || 0), 0);
  const valorAnual  = ativos.reduce((s,c) => s + (parseFloat(c.valor_anual)  || 0), 0);

  const pago    = movimentos.filter(m => m.status === 'Pago')
    .reduce((s,m) => s + (parseFloat(m.valor_nota) || 0), 0);
  const pendente= movimentos.filter(m => m.status !== 'Pago' && m.status !== 'Cancelado')
    .reduce((s,m) => s + (parseFloat(m.valor_nota) || 0), 0);

  const boletosAguardando = movimentos.filter(m => m.numero_boleto && !m.data_pagamento).length;
  const nfPendentes       = movimentos.filter(m => !m.data_recebimento_nf).length;

  // Boleto não recebido: vencimento a ≤7 dias ou já passado, sem data de
  // recebimento do boleto. É este o alerta acompanhado pelo gestor —
  // não "vencido para pagamento", mas "boleto ainda não está em mãos
  // perto do prazo".
  const boletosNaoRecebidos = movimentos.filter(m => {
    if (m.data_recebimento_boleto) return false;
    if (!m.data_vencimento) return false;
    const dias = Math.round((new Date(m.data_vencimento) - hoje) / 86400000);
    return dias <= 7;
  }).length;

  // NF recebida após o vencimento do boleto — sem tempo hábil de processamento
  const nfTardia = movimentos.filter(m =>
    m.data_recebimento_nf && m.data_vencimento &&
    new Date(m.data_recebimento_nf) > new Date(m.data_vencimento)
  ).length;

  // Evolução mensal — últimos 6 meses
  const evolucao = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje);
    d.setMonth(d.getMonth() - i);
    const m = d.getMonth() + 1;
    const a = d.getFullYear();
    const total = movimentos
      .filter(mv => parseInt(mv.mes) === m && parseInt(mv.ano) === a && mv.data_pagamento)
      .reduce((s, mv) => s + (parseFloat(mv.valor_nota) || 0), 0);
    evolucao.push({ mes: m, ano: a, total });
  }

  // Por fornecedor
  const porFornecedor = {};
  movimentos.forEach(mv => {
    const c = contratos.find(x => x.id === mv.id_contrato);
    if (!c) return;
    if (!porFornecedor[c.fornecedor]) porFornecedor[c.fornecedor] = 0;
    porFornecedor[c.fornecedor] += parseFloat(mv.valor_nota) || 0;
  });

  // Por categoria
  const porCategoria = {};
  ativos.forEach(c => {
    if (!porCategoria[c.categoria]) porCategoria[c.categoria] = 0;
    porCategoria[c.categoria] += parseFloat(c.valor_mensal) || 0;
  });

  return {
    dashboard: {
      total_contratos:    contratos.length,
      contratos_ativos:   ativos.length,
      contratos_vencidos: vencidos.length,
      contratos_vencendo: vencendo30.length,
      valor_mensal:       valorMensal,
      valor_anual:        valorAnual,
      total_pago:         pago,
      total_pendente:     pendente,
      total_fornecedores: fornecedores.length,
      boletos_aguardando: boletosAguardando,
      nf_pendentes:       nfPendentes,
      boletos_nao_recebidos: boletosNaoRecebidos,
      nf_tardia:          nfTardia,
      evolucao_mensal:    evolucao,
      por_fornecedor:     porFornecedor,
      por_categoria:      porCategoria,
    }
  };
}

// ══════════════════════════════════════════════════════════
// SETUP — CRIA TODAS AS ABAS E ESTRUTURA
// ══════════════════════════════════════════════════════════

/**
 * Execute esta função manualmente no Apps Script Editor
 * para inicializar/verificar a estrutura da planilha.
 */
function setup() {
  const ss = _getSpreadsheet();

  Object.entries(HEADERS).forEach(([sheetName, headers]) => {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('Aba criada: ' + sheetName);
    }

    // Verificar / criar cabeçalhos
    const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const headersOk = headers.every((h, i) => existingHeaders[i] === h);

    if (!headersOk) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Formatar cabeçalho
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#1E3A5F')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold')
        .setFontSize(11);
      sheet.setFrozenRows(1);
      Logger.log('Cabeçalhos definidos em: ' + sheetName);
    }

    // Auto-resize colunas
    try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
  });

  // Inserir configurações padrão
  const cfgSheet = ss.getSheetByName(SHEETS.CONFIGURACOES);
  if (cfgSheet && cfgSheet.getLastRow() <= 1) {
    const configs = [
      ['sistema_nome',    'ContratosGI'],
      ['versao',          '1.0.0'],
      ['empresa_padrao',  'Caruaru Shopping'],
      ['moeda',           'BRL'],
      ['data_setup',      _now()],
    ];
    configs.forEach(([k, v]) => {
      cfgSheet.appendRow([k, v]);
    });
  }

  // Inserir usuário admin padrão
  const userSheet = ss.getSheetByName(SHEETS.USUARIOS);
  if (userSheet && userSheet.getLastRow() <= 1) {
    userSheet.appendRow(['U001', 'Rafael', 'ti@caruarushopping.com', 'Admin', 'Ativo']);
  }

  Logger.log('Setup concluído com sucesso!');
  return { success: true, message: 'Estrutura criada com sucesso!' };
}

// ══════════════════════════════════════════════════════════
// HELPERS — ACESSO AO SHEETS
// ══════════════════════════════════════════════════════════

function _getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function _getSheet(name) {
  const sheet = _getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`Aba "${name}" não encontrada. Execute a função setup().`);
  return sheet;
}

/** Lê todas as linhas de dados (sem cabeçalho) */
function _readAll(sheetName) {
  const sheet = _getSheet(sheetName);
  const last  = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues()
    .filter(row => row.some(cell => cell !== ''));
}

/** Converte array de valores para objeto usando os headers */
function _rowToObj(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let val = row[i];
    if (val instanceof Date) val = val.toISOString().slice(0, 10);
    obj[h] = val === null || val === undefined ? '' : String(val);
  });
  return obj;
}

/** Encontra uma linha pelo valor de uma coluna */
function _findRow(sheetName, keyCol, keyVal) {
  const sheet   = _getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const colIdx  = headers.indexOf(keyCol) + 1;
  if (!colIdx) return null;

  const last = sheet.getLastRow();
  if (last < 2) return null;

  const values = sheet.getRange(2, colIdx, last - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(keyVal)) {
      return sheet.getRange(i + 2, 1, 1, headers.length).getValues()[0];
    }
  }
  return null;
}

/** Encontra o índice da linha (1-based) */
function _findRowIndex(sheetName, keyCol, keyVal) {
  const sheet  = _getSheet(sheetName);
  const headers= HEADERS[sheetName];
  const colIdx = headers.indexOf(keyCol) + 1;
  const last   = sheet.getLastRow();
  if (last < 2) return -1;

  const values = sheet.getRange(2, colIdx, last - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(keyVal)) return i + 2;
  }
  return -1;
}

/** Adiciona nova linha */
function _appendRow(sheetName, headers, obj) {
  const sheet = _getSheet(sheetName);
  const row   = headers.map(h => {
    const v = obj[h];
    return v === undefined || v === null ? '' : v;
  });
  sheet.appendRow(row);
}

/** Atualiza uma linha existente */
function _updateRow(sheetName, keyCol, keyVal, headers, newData) {
  const idx = _findRowIndex(sheetName, keyCol, keyVal);
  if (idx < 0) return false;

  const sheet    = _getSheet(sheetName);
  const existing = sheet.getRange(idx, 1, 1, headers.length).getValues()[0];
  const current  = _rowToObj(headers, existing);

  // Merge: mantém valores existentes onde newData não define
  const merged = { ...current, ...newData };
  const row    = headers.map(h => merged[h] === undefined ? '' : merged[h]);
  sheet.getRange(idx, 1, 1, headers.length).setValues([row]);
  return true;
}

/** Remove uma linha pelo valor de chave */
function _deleteRow(sheetName, keyCol, keyVal) {
  const idx = _findRowIndex(sheetName, keyCol, keyVal);
  if (idx < 0) return false;
  _getSheet(sheetName).deleteRow(idx);
  return true;
}

/** Remove todas as linhas onde coluna = valor */
function _deleteAllWhere(sheetName, keyCol, keyVal) {
  const sheet  = _getSheet(sheetName);
  const headers= HEADERS[sheetName];
  const colIdx = headers.indexOf(keyCol) + 1;
  const last   = sheet.getLastRow();
  if (last < 2) return;

  // Percorrer de baixo para cima para não pular linhas
  for (let i = last; i >= 2; i--) {
    if (String(sheet.getRange(i, colIdx).getValue()) === String(keyVal)) {
      sheet.deleteRow(i);
    }
  }
}

/** Gera ID sequencial com prefixo */
function _generateId(prefix, sheetName, keyCol) {
  const rows = _readAll(sheetName);
  if (!rows.length) return prefix + '0001';
  const headers = HEADERS[sheetName];
  const idx     = headers.indexOf(keyCol);
  const nums    = rows
    .map(r => parseInt(String(r[idx] || '0').replace(/\D/g, '')) || 0)
    .filter(n => !isNaN(n));
  const max     = nums.length ? Math.max(...nums) : 0;
  return prefix + String(max + 1).padStart(4, '0');
}

// ══════════════════════════════════════════════════════════
// HELPERS — UTILS
// ══════════════════════════════════════════════════════════

function _now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function _parseBody(e) {
  try {
    if (e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (_) {}
  return e.parameter || {};
}

function _validateRequired(obj, fields) {
  fields.forEach(f => {
    if (!obj[f] && obj[f] !== 0) throw new Error(`Campo obrigatório ausente: "${f}"`);
  });
}

function _jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _audit(usuario, acao, entidade, idEntidade) {
  try {
    const sheet = _getSpreadsheet().getSheetByName(SHEETS.AUDITORIA);
    if (!sheet) return;
    sheet.appendRow([_now(), usuario, acao, entidade, idEntidade, '']);
  } catch(_) { /* não quebrar por falha de auditoria */ }
}

// ══════════════════════════════════════════════════════════
// TESTES MANUAIS (execute no editor do Apps Script)
// ══════════════════════════════════════════════════════════

/** Teste: listar contratos */
function testeGetContratos() {
  const result = getContratos({});
  Logger.log(JSON.stringify(result, null, 2));
}

/** Teste: criar contrato */
function testePostContrato() {
  const result = postContrato({
    empresa:       'Caruaru Shopping',
    fornecedor:    'Fornecedor Teste',
    descricao:     'Contrato de Teste via Apps Script',
    categoria:     'Software',
    centro_custo:  'TI',
    responsavel:   'Rafael',
    valor_mensal:  1000,
    valor_anual:   12000,
    tipo:          'Mensal',
    data_inicio:   '2025-01-01',
    data_fim:      '2025-12-31',
    dia_vencimento:10,
    status:        'Ativo',
  });
  Logger.log(JSON.stringify(result));
}

/** Teste: dashboard */
function testeGetDashboard() {
  const result = getDashboard();
  Logger.log(JSON.stringify(result.dashboard, null, 2));
}
