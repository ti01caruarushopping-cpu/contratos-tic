/**
 * code.gs — API REST para Sistema de Gestão de Contratos de TI
 * Google Apps Script + Google Sheets
 *
 * CORS: o frontend envia TUDO via POST com Content-Type: text/plain
 * para evitar o preflight OPTIONS (que o Apps Script não responde).
 * A ação e os dados vêm dentro do corpo JSON, campo "action".
 *
 * SETUP:
 *  1. Cole este código no Apps Script da sua planilha
 *  2. Execute setup() para criar todas as abas automaticamente
 *  3. Implantar → Nova implantação → Web App
 *     Executar como: Eu | Acesso: Qualquer pessoa
 *  4. Copie a URL e cole em Configurações → Conexão API
 */

const SPREADSHEET_ID = ''; // deixe vazio para usar a planilha vinculada

const SHEETS = {
  CONTRATOS:     'CONTRATOS',
  MOVIMENTACOES: 'MOVIMENTACOES',
  FORNECEDORES:  'FORNECEDORES',
  USUARIOS:      'USUARIOS',
  CONFIGURACOES: 'CONFIGURACOES',
  AUDITORIA:     'AUDITORIA',
};

const HEADERS = {
  CONTRATOS: ['id','empresa','fornecedor','descricao','categoria','centro_custo',
    'responsavel','valor_mensal','valor_anual','tipo','data_inicio','data_fim',
    'dia_vencimento','status','observacoes','data_cadastro'],
  MOVIMENTACOES: ['id_movimento','id_contrato','mes','ano','valor_nota','numero_nf',
    'numero_boleto','data_emissao_nf','data_recebimento_nf','data_recebimento_boleto',
    'data_envio_financeiro','data_vencimento','data_pagamento','status','observacoes','usuario'],
  FORNECEDORES: ['id_fornecedor','empresa','cnpj','contato','telefone','email','categoria','status'],
  USUARIOS:     ['id_usuario','nome','email','perfil','status'],
  CONFIGURACOES:['chave','valor'],
  AUDITORIA:    ['timestamp','usuario','acao','entidade','id_entidade','detalhes'],
};

/* ── ENTRY POINTS ─────────────────────────────────────── */

/** doGet: apenas para testes manuais via navegador (?action=getDashboard) */
function doGet(e)  { return _handle(e); }

/**
 * doPost: usado pelo frontend (tudo via POST + text/plain para evitar CORS preflight).
 * A action e os parâmetros chegam dentro do corpo JSON.
 */
function doPost(e) { return _handle(e); }

function _handle(e) {
  try {
    const body   = _parseBody(e);
    const params = Object.keys(body).length ? body : (e.parameter || {});
    const action = params.action || '';
    _audit(params.usuario||'sistema', action, 'REQUEST', '');

    let result;
    switch(action) {
      case 'getContratos':       result = getContratos(params);             break;
      case 'getContrato':        result = getContrato(params.id);           break;
      case 'postContrato':       result = postContrato(params);             break;
      case 'putContrato':        result = putContrato(params);              break;
      case 'deleteContrato':     result = deleteContrato(params.id);        break;
      case 'getMovimentacoes':   result = getMovimentacoes(params);         break;
      case 'postMovimentacao':   result = postMovimentacao(params);         break;
      case 'putMovimentacao':    result = putMovimentacao(params);          break;
      case 'deleteMovimentacao': result = deleteMovimentacao(params.id_movimento); break;
      case 'getFornecedores':    result = getFornecedores();                break;
      case 'postFornecedor':     result = postFornecedor(params);           break;
      case 'putFornecedor':      result = putFornecedor(params);            break;
      case 'deleteFornecedor':   result = deleteFornecedor(params.id_fornecedor); break;
      case 'getDashboard':       result = getDashboard();                   break;
      case 'setup':              result = setup();                          break;
      default: result = { error: `Ação desconhecida: "${action}"` };
    }
    return _json(result);
  } catch(err) {
    Logger.log('ERRO: ' + err.message + '\n' + err.stack);
    return _json({ error: err.message });
  }
}

/* ── CONTRATOS ─────────────────────────────────────────── */
function getContratos(p) {
  let data = _readAll(SHEETS.CONTRATOS).map(r => _obj(HEADERS.CONTRATOS, r));
  if (p.status)      data = data.filter(r => r.status      === p.status);
  if (p.empresa)     data = data.filter(r => r.empresa     === p.empresa);
  if (p.categoria)   data = data.filter(r => r.categoria   === p.categoria);
  if (p.fornecedor)  data = data.filter(r => r.fornecedor?.toLowerCase().includes(p.fornecedor.toLowerCase()));
  if (p.centro_custo)data = data.filter(r => r.centro_custo=== p.centro_custo);
  return { contratos: data };
}
function getContrato(id) {
  if (!id) return { error: 'ID obrigatório' };
  const row = _findRow(SHEETS.CONTRATOS, 'id', id);
  return { contrato: row ? _obj(HEADERS.CONTRATOS, row) : null };
}
function postContrato(b) {
  _req(b, ['empresa','fornecedor','descricao','categoria','responsavel']);
  const id = _genId('C', SHEETS.CONTRATOS, 'id');
  b.id = id; b.data_cadastro = _now();
  b.valor_anual = b.valor_anual || (parseFloat(b.valor_mensal||0)*12);
  _append(SHEETS.CONTRATOS, HEADERS.CONTRATOS, b);
  _audit(b.responsavel,'CREATE','CONTRATO',id);
  return { success:true, id };
}
function putContrato(b) {
  if (!b.id) return { error: 'ID obrigatório' };
  const ok = _update(SHEETS.CONTRATOS,'id',b.id,HEADERS.CONTRATOS,b);
  if (!ok) return { error: 'Contrato não encontrado: '+b.id };
  _audit(b.responsavel||'sistema','UPDATE','CONTRATO',b.id);
  return { success:true };
}
function deleteContrato(id) {
  if (!id) return { error: 'ID obrigatório' };
  _deleteRow(SHEETS.CONTRATOS,'id',id);
  _deleteWhere(SHEETS.MOVIMENTACOES,'id_contrato',id);
  _audit('sistema','DELETE','CONTRATO',id);
  return { success:true };
}

/* ── MOVIMENTAÇÕES ─────────────────────────────────────── */
function getMovimentacoes(p) {
  let data = _readAll(SHEETS.MOVIMENTACOES).map(r => _obj(HEADERS.MOVIMENTACOES, r));
  if (p.id_contrato) data = data.filter(r => r.id_contrato === p.id_contrato);
  if (p.mes)         data = data.filter(r => String(r.mes)  === String(p.mes));
  if (p.ano)         data = data.filter(r => String(r.ano)  === String(p.ano));
  if (p.status)      data = data.filter(r => r.status       === p.status);
  return { movimentacoes: data };
}
function postMovimentacao(b) {
  _req(b, ['id_contrato','mes','ano','valor_nota']);
  const id = _genId('M', SHEETS.MOVIMENTACOES, 'id_movimento');
  b.id_movimento = id;
  _append(SHEETS.MOVIMENTACOES, HEADERS.MOVIMENTACOES, b);
  _audit(b.usuario||'sistema','CREATE','MOVIMENTACAO',id);
  return { success:true, id_movimento:id };
}
function putMovimentacao(b) {
  if (!b.id_movimento) return { error: 'id_movimento obrigatório' };
  const ok = _update(SHEETS.MOVIMENTACOES,'id_movimento',b.id_movimento,HEADERS.MOVIMENTACOES,b);
  if (!ok) return { error: 'Movimentação não encontrada' };
  _audit(b.usuario||'sistema','UPDATE','MOVIMENTACAO',b.id_movimento);
  return { success:true };
}
function deleteMovimentacao(id) {
  if (!id) return { error: 'id_movimento obrigatório' };
  _deleteRow(SHEETS.MOVIMENTACOES,'id_movimento',id);
  _audit('sistema','DELETE','MOVIMENTACAO',id);
  return { success:true };
}

/* ── FORNECEDORES ──────────────────────────────────────── */
function getFornecedores() {
  return { fornecedores: _readAll(SHEETS.FORNECEDORES).map(r => _obj(HEADERS.FORNECEDORES, r)) };
}
function postFornecedor(b) {
  _req(b,['empresa','categoria']);
  const id = _genId('F', SHEETS.FORNECEDORES, 'id_fornecedor');
  b.id_fornecedor = id;
  _append(SHEETS.FORNECEDORES, HEADERS.FORNECEDORES, b);
  return { success:true, id_fornecedor:id };
}
function putFornecedor(b) {
  if (!b.id_fornecedor) return { error: 'id_fornecedor obrigatório' };
  _update(SHEETS.FORNECEDORES,'id_fornecedor',b.id_fornecedor,HEADERS.FORNECEDORES,b);
  return { success:true };
}
function deleteFornecedor(id) {
  if (!id) return { error: 'id_fornecedor obrigatório' };
  _deleteRow(SHEETS.FORNECEDORES,'id_fornecedor',id);
  return { success:true };
}

/* ── DASHBOARD ─────────────────────────────────────────── */
function getDashboard() {
  const hoje        = new Date();
  const contratos   = _readAll(SHEETS.CONTRATOS).map(r   => _obj(HEADERS.CONTRATOS,   r));
  const movimentos  = _readAll(SHEETS.MOVIMENTACOES).map(r=> _obj(HEADERS.MOVIMENTACOES,r));
  const fornecedores= _readAll(SHEETS.FORNECEDORES).map(r => _obj(HEADERS.FORNECEDORES, r));

  const ativos     = contratos.filter(c => c.status === 'Ativo');
  const vencidos   = ativos.filter(c => c.data_fim && new Date(c.data_fim) < hoje);
  const vencendo30 = ativos.filter(c => {
    if (!c.data_fim) return false;
    const d = (new Date(c.data_fim) - hoje) / 86400000;
    return d >= 0 && d <= 30;
  });

  const valorMensal = ativos.reduce((s,c) => s+(parseFloat(c.valor_mensal)||0), 0);
  const valorAnual  = ativos.reduce((s,c) => s+(parseFloat(c.valor_anual) ||0), 0);
  const pago        = movimentos.filter(m=>m.status==='Pago').reduce((s,m)=>s+(parseFloat(m.valor_nota)||0),0);
  const pendente    = movimentos.filter(m=>m.status!=='Pago').reduce((s,m)=>s+(parseFloat(m.valor_nota)||0),0);

  const boletosAguardando = movimentos.filter(m => m.data_recebimento_boleto && !m.data_envio_financeiro).length;
  const nfPendentes       = movimentos.filter(m => !m.data_recebimento_nf).length;

  // Boleto não recebido perto do vencimento (controle do gestor)
  const boletosNaoRecebidos = movimentos.filter(m => {
    if (m.data_recebimento_boleto) return false;
    if (!m.data_vencimento) return false;
    return Math.round((new Date(m.data_vencimento) - hoje) / 86400000) <= 7;
  }).length;

  // NF recebida após vencimento do boleto
  const nfTardia = movimentos.filter(m =>
    m.data_recebimento_nf && m.data_vencimento &&
    new Date(m.data_recebimento_nf) > new Date(m.data_vencimento)
  ).length;

  // Evolução últimos 6 meses
  const evolucao = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje); d.setMonth(d.getMonth() - i);
    const m = d.getMonth() + 1, a = d.getFullYear();
    const total = movimentos
      .filter(mv => parseInt(mv.mes)===m && parseInt(mv.ano)===a && mv.data_pagamento)
      .reduce((s,mv)=>s+(parseFloat(mv.valor_nota)||0), 0);
    evolucao.push({ mes:m, ano:a, total });
  }

  const porFornecedor = {};
  movimentos.forEach(mv => {
    const c = contratos.find(x=>x.id===mv.id_contrato);
    if (!c) return;
    if (!porFornecedor[c.fornecedor]) porFornecedor[c.fornecedor] = 0;
    porFornecedor[c.fornecedor] += parseFloat(mv.valor_nota)||0;
  });

  const porCategoria = {};
  ativos.forEach(c => {
    if (!porCategoria[c.categoria]) porCategoria[c.categoria] = 0;
    porCategoria[c.categoria] += parseFloat(c.valor_mensal)||0;
  });

  return { dashboard: {
    total_contratos:      contratos.length,
    contratos_ativos:     ativos.length,
    contratos_vencidos:   vencidos.length,
    contratos_vencendo:   vencendo30.length,
    valor_mensal:         valorMensal,
    valor_anual:          valorAnual,
    total_pago:           pago,
    total_pendente:       pendente,
    total_fornecedores:   fornecedores.length,
    boletos_aguardando:   boletosAguardando,
    nf_pendentes:         nfPendentes,
    boletos_nao_recebidos:boletosNaoRecebidos,
    nf_tardia:            nfTardia,
    evolucao_mensal:      evolucao,
    por_fornecedor:       porFornecedor,
    por_categoria:        porCategoria,
  }};
}

/* ── SETUP ─────────────────────────────────────────────── */
function setup() {
  const ss = _ss();
  Object.entries(HEADERS).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); Logger.log('Aba criada: '+name); }
    const existing = sheet.getRange(1,1,1,headers.length).getValues()[0];
    if (!headers.every((h,i)=>existing[i]===h)) {
      sheet.getRange(1,1,1,headers.length).setValues([headers])
        .setBackground('#1E3A5F').setFontColor('#FFFFFF')
        .setFontWeight('bold').setFontSize(11);
      sheet.setFrozenRows(1);
    }
    try { sheet.autoResizeColumns(1, headers.length); } catch(_){}
  });

  const cfg = ss.getSheetByName(SHEETS.CONFIGURACOES);
  if (cfg && cfg.getLastRow() <= 1) {
    [['sistema_nome','ContratosGI'],['versao','1.0.0'],
     ['empresa_padrao','Caruaru Shopping'],['moeda','BRL'],
     ['data_setup',_now()]].forEach(r => cfg.appendRow(r));
  }

  const usr = ss.getSheetByName(SHEETS.USUARIOS);
  if (usr && usr.getLastRow() <= 1) {
    usr.appendRow(['U001','Rafael','ti@caruarushopping.com','Admin','Ativo']);
  }
  Logger.log('Setup concluído!');
  return { success:true, message:'Estrutura criada com sucesso!' };
}

/* ── HELPERS ───────────────────────────────────────────── */
function _ss() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function _sheet(name) {
  const s = _ss().getSheetByName(name);
  if (!s) throw new Error(`Aba "${name}" não encontrada. Execute setup().`);
  return s;
}
function _readAll(name) {
  const s = _sheet(name); const last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2,1,last-1,s.getLastColumn()).getValues()
    .filter(r => r.some(c => c !== ''));
}
function _obj(headers, row) {
  const o = {};
  headers.forEach((h,i) => { let v=row[i]; if(v instanceof Date)v=v.toISOString().slice(0,10); o[h]=v===null||v===undefined?'':String(v); });
  return o;
}
function _findIdx(name, col, val) {
  const s = _sheet(name); const h = HEADERS[name];
  const ci = h.indexOf(col)+1; const last = s.getLastRow();
  if (last<2||!ci) return -1;
  const vals = s.getRange(2,ci,last-1,1).getValues();
  for (let i=0;i<vals.length;i++) { if(String(vals[i][0])===String(val)) return i+2; }
  return -1;
}
function _findRow(name, col, val) {
  const idx = _findIdx(name,col,val); if(idx<0) return null;
  return _sheet(name).getRange(idx,1,1,HEADERS[name].length).getValues()[0];
}
function _append(name, headers, obj) {
  _sheet(name).appendRow(headers.map(h => obj[h]===undefined||obj[h]===null?'':obj[h]));
}
function _update(name, col, val, headers, data) {
  const idx = _findIdx(name,col,val); if(idx<0) return false;
  const s = _sheet(name);
  const cur = _obj(headers, s.getRange(idx,1,1,headers.length).getValues()[0]);
  const merged = {...cur,...data};
  s.getRange(idx,1,1,headers.length).setValues([headers.map(h=>merged[h]===undefined?'':merged[h])]);
  return true;
}
function _deleteRow(name, col, val) {
  const idx = _findIdx(name,col,val); if(idx<0) return false;
  _sheet(name).deleteRow(idx); return true;
}
function _deleteWhere(name, col, val) {
  const s=_sheet(name); const h=HEADERS[name]; const ci=h.indexOf(col)+1;
  const last=s.getLastRow(); if(last<2) return;
  for(let i=last;i>=2;i--) { if(String(s.getRange(i,ci).getValue())===String(val)) s.deleteRow(i); }
}
function _genId(prefix, name, col) {
  const rows = _readAll(name); if(!rows.length) return prefix+'0001';
  const h = HEADERS[name]; const idx = h.indexOf(col);
  const nums = rows.map(r=>parseInt(String(r[idx]||'0').replace(/\D/g,''))||0).filter(n=>!isNaN(n));
  return prefix+String((nums.length?Math.max(...nums):0)+1).padStart(4,'0');
}
function _now() { return new Date().toISOString().slice(0,19).replace('T',' '); }
function _parseBody(e) {
  try { if(e.postData?.contents) return JSON.parse(e.postData.contents); } catch(_){}
  return e.parameter||{};
}
function _req(obj, fields) {
  fields.forEach(f => { if(!obj[f]&&obj[f]!==0) throw new Error(`Campo obrigatório: "${f}"`); });
}
function _json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function _audit(usuario, acao, entidade, id) {
  try { const s=_ss().getSheetByName(SHEETS.AUDITORIA); if(s) s.appendRow([_now(),usuario,acao,entidade,id,'']); } catch(_){}
}

/* ── TESTES MANUAIS (rodar no editor do Apps Script) ── */
function testeSetup()       { Logger.log(JSON.stringify(setup())); }
function testeDashboard()   { Logger.log(JSON.stringify(getDashboard())); }
function testeContratos()   { Logger.log(JSON.stringify(getContratos({}))); }
