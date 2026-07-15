/**
 * api.js — Camada de serviços
 * Abstrai todas as chamadas ao Google Apps Script.
 * Para trocar o backend, altere apenas este arquivo.
 *
 * Fluxo: Frontend → api.js → GAS_URL → Google Sheets
 */

const API = (() => {

  /* ── Configuração ────────────────────────────────────────── */
  const CONFIG = {
    // Substitua pela URL do seu Web App publicado no Apps Script
    GAS_URL: localStorage.getItem('gas_url') || '',
    TIMEOUT: 15000, // 15 segundos
  };

  /* ── Cache em memória ────────────────────────────────────── */
  const _cache = new Map();
  const CACHE_TTL = 30_000; // 30s

  function _cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
    return entry.data;
  }
  function _cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }); }
  function _cacheInvalidate(pattern) {
    for (const key of _cache.keys()) {
      if (key.startsWith(pattern)) _cache.delete(key);
    }
  }

  /* ── Fetch helper ────────────────────────────────────────────
     CORS: todas as chamadas usam POST com Content-Type: text/plain
     (header "simples", não dispara preflight OPTIONS).
     Resiliência: retry automático com backoff em erros de rede,
     e cache persistente em sessionStorage para evitar tela em branco.
  ── ────────────────────────────────────────────────────────── */
  async function _request(action, params = {}, body = null, tentativa = 1) {
    if (!CONFIG.GAS_URL) throw new Error('URL da API não configurada. Acesse Configurações → API.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
      const payload = { action, ...params, ...(body || {}) };

      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Persiste resultado no sessionStorage para uso como fallback
      if (!body) { // só em leituras (sem body de escrita)
        try { sessionStorage.setItem('_api_' + action + JSON.stringify(params), JSON.stringify(json)); } catch(_) {}
      }

      return json;

    } catch (e) {
      clearTimeout(timer);

      // Retry automático até 3 tentativas em erros de rede/timeout
      const redeErro = e.name === 'AbortError' || e.name === 'TypeError' || e.message.includes('fetch');
      if (redeErro && tentativa < 3) {
        await new Promise(r => setTimeout(r, tentativa * 1200));
        return _request(action, params, body, tentativa + 1);
      }

      // Fallback: tenta retornar cache salvo da sessão anterior (evita tela em branco)
      if (!body) {
        const cached = sessionStorage.getItem('_api_' + action + JSON.stringify(params));
        if (cached) {
          console.warn(`[API] Usando cache de sessão para "${action}" — ${e.message}`);
          const parsed = JSON.parse(cached);
          parsed._fromCache = true;
          return parsed;
        }
      }

      if (e.name === 'AbortError') throw new Error('Tempo limite excedido. Verifique sua conexão.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ── Fallback para demo sem API ──────────────────────────── */
  function _demoMode() { return !CONFIG.GAS_URL; }

  /* ── CONTRATOS ───────────────────────────────────────────── */
  async function listarContratos(filtros = {}) {
    if (_demoMode()) return Demo.contratos.filter(c => _aplicarFiltros(c, filtros));
    const ck = 'contratos:' + JSON.stringify(filtros);
    const cached = _cacheGet(ck);
    if (cached) return cached;
    const data = await _request('getContratos', filtros);
    _cacheSet(ck, data.contratos);
    return data.contratos;
  }

  async function obterContrato(id) {
    if (_demoMode()) return Demo.contratos.find(c => c.id === id) || null;
    const data = await _request('getContrato', { id });
    return data.contrato;
  }

  async function salvarContrato(contrato) {
    _cacheInvalidate('contratos');
    _cacheInvalidate('dashboard');
    if (_demoMode()) {
      if (contrato.id) {
        const i = Demo.contratos.findIndex(c => c.id === contrato.id);
        if (i > -1) Demo.contratos[i] = { ...Demo.contratos[i], ...contrato };
        return { success: true, id: contrato.id };
      }
      const id = 'C' + String(Demo.contratos.length + 1).padStart(4, '0');
      Demo.contratos.push({ ...contrato, id, data_cadastro: new Date().toISOString() });
      return { success: true, id };
    }
    const action = contrato.id ? 'putContrato' : 'postContrato';
    return _request(action, {}, contrato);
  }

  async function excluirContrato(id) {
    _cacheInvalidate('contratos');
    _cacheInvalidate('dashboard');
    if (_demoMode()) {
      Demo.contratos = Demo.contratos.filter(c => c.id !== id);
      Demo.movimentacoes = Demo.movimentacoes.filter(m => m.id_contrato !== id);
      return { success: true };
    }
    return _request('deleteContrato', { id });
  }

  /* ── MOVIMENTAÇÕES ───────────────────────────────────────── */
  async function listarMovimentacoes(id_contrato) {
    if (_demoMode()) return Demo.movimentacoes.filter(m => m.id_contrato === id_contrato);
    const data = await _request('getMovimentacoes', { id_contrato });
    return data.movimentacoes;
  }

  async function salvarMovimentacao(mov) {
    _cacheInvalidate('dashboard');
    _cacheInvalidate('contratos');
    if (_demoMode()) {
      if (mov.id_movimento) {
        const i = Demo.movimentacoes.findIndex(m => m.id_movimento === mov.id_movimento);
        if (i > -1) Demo.movimentacoes[i] = { ...Demo.movimentacoes[i], ...mov };
        return { success: true };
      }
      const id = 'M' + String(Demo.movimentacoes.length + 1).padStart(5, '0');
      Demo.movimentacoes.push({ ...mov, id_movimento: id });
      return { success: true, id_movimento: id };
    }
    const action = mov.id_movimento ? 'putMovimentacao' : 'postMovimentacao';
    return _request(action, {}, mov);
  }

  async function excluirMovimentacao(id_movimento) {
    _cacheInvalidate('dashboard');
    if (_demoMode()) {
      Demo.movimentacoes = Demo.movimentacoes.filter(m => m.id_movimento !== id_movimento);
      return { success: true };
    }
    return _request('deleteMovimentacao', { id_movimento });
  }

  /* ── FORNECEDORES ────────────────────────────────────────── */
  async function listarFornecedores() {
    if (_demoMode()) return Demo.fornecedores;
    const cached = _cacheGet('fornecedores');
    if (cached) return cached;
    const data = await _request('getFornecedores');
    _cacheSet('fornecedores', data.fornecedores);
    return data.fornecedores;
  }

  async function salvarFornecedor(forn) {
    _cacheInvalidate('fornecedores');
    if (_demoMode()) {
      if (forn.id_fornecedor) {
        const i = Demo.fornecedores.findIndex(f => f.id_fornecedor === forn.id_fornecedor);
        if (i > -1) Demo.fornecedores[i] = { ...Demo.fornecedores[i], ...forn };
        return { success: true };
      }
      const id = 'F' + String(Demo.fornecedores.length + 1).padStart(3, '0');
      Demo.fornecedores.push({ ...forn, id_fornecedor: id });
      return { success: true };
    }
    const action = forn.id_fornecedor ? 'putFornecedor' : 'postFornecedor';
    return _request(action, {}, forn);
  }

  async function excluirFornecedor(id_fornecedor) {
    _cacheInvalidate('fornecedores');
    if (_demoMode()) {
      Demo.fornecedores = Demo.fornecedores.filter(f => f.id_fornecedor !== id_fornecedor);
      return { success: true };
    }
    return _request('deleteFornecedor', { id_fornecedor });
  }

  /* ── DASHBOARD ───────────────────────────────────────────── */
  async function obterDashboard() {
    if (_demoMode()) return _calcularDashboardDemo();
    const cached = _cacheGet('dashboard');
    if (cached) return cached;
    const data = await _request('getDashboard');
    _cacheSet('dashboard', data.dashboard);
    return data.dashboard;
  }

  /* ── CONFIGURAÇÕES ───────────────────────────────────────── */
  function setApiUrl(url) {
    CONFIG.GAS_URL = url.trim();
    localStorage.setItem('gas_url', CONFIG.GAS_URL);
    _cache.clear();
  }
  function getApiUrl() { return CONFIG.GAS_URL; }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _aplicarFiltros(c, f) {
    if (f.empresa    && !c.empresa?.toLowerCase().includes(f.empresa.toLowerCase())) return false;
    if (f.fornecedor && !c.fornecedor?.toLowerCase().includes(f.fornecedor.toLowerCase())) return false;
    if (f.status     && c.status !== f.status) return false;
    if (f.categoria  && c.categoria !== f.categoria) return false;
    if (f.centro_custo && c.centro_custo !== f.centro_custo) return false;
    return true;
  }

  function _calcularDashboardDemo() {
    const hoje = new Date();
    const contratos = Demo.contratos;
    const movs = Demo.movimentacoes;
    const ativos = contratos.filter(c => c.status === 'Ativo');
    const vencidos = contratos.filter(c => c.status === 'Ativo' && new Date(c.data_fim) < hoje);
    const vencendo30 = contratos.filter(c => {
      const d = new Date(c.data_fim);
      const diff = (d - hoje) / 86400000;
      return c.status === 'Ativo' && diff >= 0 && diff <= 30;
    });
    const valorMensal = ativos.reduce((s, c) => s + (parseFloat(c.valor_mensal) || 0), 0);
    const valorAnual  = ativos.reduce((s, c) => s + (parseFloat(c.valor_anual)  || 0), 0);
    const pago       = movs.filter(m => m.status === 'Pago').reduce((s, m) => s + (parseFloat(m.valor_nota) || 0), 0);
    const pendente   = movs.filter(m => m.status !== 'Pago' && m.status !== 'Cancelado').reduce((s, m) => s + (parseFloat(m.valor_nota) || 0), 0);
    const boletosAguardando = movs.filter(m => m.numero_boleto && !m.data_pagamento).length;
    const nfPendentes = movs.filter(m => !m.data_recebimento_nf).length;

    // Boleto não recebido: vencimento a ≤7 dias ou já passado, sem data_recebimento_boleto.
    // É o alerta que o gestor acompanha — não importa "vencido para pagamento",
    // importa se o boleto ainda não chegou perto do prazo.
    const boletosNaoRecebidos = movs.filter(m => {
      if (m.data_recebimento_boleto) return false;
      if (!m.data_vencimento) return false;
      const dias = Math.round((new Date(m.data_vencimento) - hoje) / 86400000);
      return dias <= 10;
    }).length;

    // NF recebida após o vencimento do boleto — sem tempo hábil de processamento
    const nfTardia = movs.filter(m =>
      m.data_recebimento_nf && m.data_vencimento &&
      new Date(m.data_recebimento_nf) > new Date(m.data_vencimento)
    ).length;

    // Evolução mensal (últimos 6 meses)
    const evolucao = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const a = d.getFullYear();
      const total = movs
        .filter(mv => mv.mes == m && mv.ano == a && mv.data_pagamento)
        .reduce((s, mv) => s + (parseFloat(mv.valor_nota) || 0), 0);
      evolucao.push({ mes: m, ano: a, total });
    }

    // Por fornecedor
    const porFornecedor = {};
    movs.forEach(mv => {
      const c = contratos.find(c => c.id === mv.id_contrato);
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
      total_contratos:    contratos.length,
      contratos_ativos:   ativos.length,
      contratos_vencidos: vencidos.length,
      contratos_vencendo: vencendo30.length,
      valor_mensal:       valorMensal,
      valor_anual:        valorAnual,
      total_pago:         pago,
      total_pendente:     pendente,
      total_fornecedores: Demo.fornecedores.length,
      boletos_aguardando: boletosAguardando,
      nf_pendentes:       nfPendentes,
      boletos_nao_recebidos: boletosNaoRecebidos,
      nf_tardia:          nfTardia,
      evolucao_mensal:    evolucao,
      por_fornecedor:     porFornecedor,
      por_categoria:      porCategoria,
    };
  }

  /* ── Exportar ────────────────────────────────────────────── */
  return {
    listarContratos,
    obterContrato,
    salvarContrato,
    excluirContrato,
    listarMovimentacoes,
    salvarMovimentacao,
    excluirMovimentacao,
    listarFornecedores,
    salvarFornecedor,
    excluirFornecedor,
    obterDashboard,
    setApiUrl,
    getApiUrl,
  };

})();

/* ── DADOS DE DEMONSTRAÇÃO ───────────────────────────────── */
const Demo = (() => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  const fornecedores = [
    { id_fornecedor: 'F001', empresa: 'Caruaru Shopping', cnpj: '12.345.678/0001-01', contato: 'João Silva', telefone: '(81) 99900-0001', email: 'ti@caruarushopping.com', categoria: 'Infraestrutura', status: 'Ativo' },
    { id_fornecedor: 'F002', empresa: 'Microsoft Brasil', cnpj: '23.456.789/0001-02', contato: 'Ana Costa', telefone: '0800-722-0808', email: 'suporte@microsoft.com', categoria: 'Software', status: 'Ativo' },
    { id_fornecedor: 'F003', empresa: 'AWS Brasil', cnpj: '34.567.890/0001-03', contato: 'Pedro Lima', telefone: '(11) 4007-0100', email: 'suporte@aws.com', categoria: 'Cloud', status: 'Ativo' },
    { id_fornecedor: 'F004', empresa: 'Vivo Empresas', cnpj: '45.678.901/0001-04', contato: 'Maria Santos', telefone: '0800-940-1234', email: 'empresas@vivo.com', categoria: 'Telecom', status: 'Ativo' },
    { id_fornecedor: 'F005', empresa: 'Fortinet Brasil', cnpj: '56.789.012/0001-05', contato: 'Carlos Neto', telefone: '(11) 3050-4500', email: 'suporte@fortinet.com', categoria: 'Segurança', status: 'Ativo' },
    { id_fornecedor: 'F006', empresa: 'Totvs S.A.', cnpj: '67.890.123/0001-06', contato: 'Fernanda Lima', telefone: '(11) 4003-0015', email: 'suporte@totvs.com', categoria: 'ERP', status: 'Ativo' },
  ];

  const contratos = [
    {
      id: 'C0001', empresa: 'Caruaru Shopping', fornecedor: 'Microsoft Brasil',
      descricao: 'Licenças Microsoft 365 Business Premium', categoria: 'Software',
      centro_custo: 'TI', responsavel: 'Rafael', valor_mensal: 3850.00, valor_anual: 46200.00,
      tipo: 'Mensal', data_inicio: `${ano - 1}-01-01`, data_fim: `${ano + 1}-12-31`,
      dia_vencimento: 10, status: 'Ativo', observacoes: '40 licenças usuários',
      data_cadastro: `${ano - 1}-01-15`,
    },
    {
      id: 'C0002', empresa: 'Caruaru Shopping', fornecedor: 'AWS Brasil',
      descricao: 'Hospedagem Cloud AWS — Serviços EC2, S3, RDS', categoria: 'Cloud',
      centro_custo: 'TI', responsavel: 'Rafael', valor_mensal: 2200.00, valor_anual: 26400.00,
      tipo: 'Mensal', data_inicio: `${ano - 1}-03-01`, data_fim: `${ano + 1}-02-28`,
      dia_vencimento: 5, status: 'Ativo', observacoes: 'Instâncias produção e homologação',
      data_cadastro: `${ano - 1}-03-05`,
    },
    {
      id: 'C0003', empresa: 'WA Hotel', fornecedor: 'Vivo Empresas',
      descricao: 'Link MPLS 100Mbps + Backup 4G', categoria: 'Telecom',
      centro_custo: 'TI / Hotel', responsavel: 'Rafael', valor_mensal: 1890.00, valor_anual: 22680.00,
      tipo: 'Mensal', data_inicio: `${ano - 2}-06-01`, data_fim: `${ano}-05-31`,
      dia_vencimento: 15, status: 'Em renovação', observacoes: 'Contrato em negociação de renovação',
      data_cadastro: `${ano - 2}-06-10`,
    },
    {
      id: 'C0004', empresa: 'WS Park', fornecedor: 'Fortinet Brasil',
      descricao: 'Suporte FortiGate 200F — Firewall UTM', categoria: 'Segurança',
      centro_custo: 'TI / Estacionamento', responsavel: 'Davydson', valor_mensal: 980.00, valor_anual: 11760.00,
      tipo: 'Anual', data_inicio: `${ano}-01-01`, data_fim: `${ano}-12-31`,
      dia_vencimento: 20, status: 'Ativo', observacoes: 'Suporte 8x5 NBD',
      data_cadastro: `${ano}-01-05`,
    },
    {
      id: 'C0005', empresa: 'Caruaru Shopping', fornecedor: 'Totvs S.A.',
      descricao: 'Licença ERP TOTVS Protheus — Módulos Financeiro e RH', categoria: 'ERP',
      centro_custo: 'Administrativo', responsavel: 'Crispim', valor_mensal: 4500.00, valor_anual: 54000.00,
      tipo: 'Mensal', data_inicio: `${ano - 3}-08-01`, data_fim: `${ano + 2}-07-31`,
      dia_vencimento: 1, status: 'Ativo', observacoes: 'Inclui suporte 24x7 e updates',
      data_cadastro: `${ano - 3}-08-01`,
    },
    {
      id: 'C0006', empresa: 'Corporate', fornecedor: 'Vivo Empresas',
      descricao: 'Plano Corporativo Celular — 20 linhas', categoria: 'Telecom',
      centro_custo: 'Administrativo', responsavel: 'Thiago', valor_mensal: 1560.00, valor_anual: 18720.00,
      tipo: 'Mensal', data_inicio: `${ano - 1}-09-01`, data_fim: `${ano + 1}-08-31`,
      dia_vencimento: 25, status: 'Ativo', observacoes: '20 linhas com dados ilimitados',
      data_cadastro: `${ano - 1}-09-10`,
    },
  ];

  // Gera movimentações para os últimos 5 meses + mês atual
  const movimentacoes = [];
  let movId = 1;

  contratos.forEach(c => {
    if (c.status === 'Cancelado' || c.status === 'Suspenso') return;
    let exemploIdx = 0;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const a = d.getFullYear();

      const venc = new Date(a, m - 1, c.dia_vencimento);
      const isAtual = i === 0;

      const nf = `NF-${a}${String(m).padStart(2,'0')}-${c.id}`;
      const boleto = `BOL-${a}${String(m).padStart(2,'0')}-${c.id}`;

      // No mês atual, varia o cenário entre os contratos para demonstrar
      // os alertas reais do controle: boleto não recebido, NF tardia,
      // boleto recebido mas não enviado, e fluxo completo (pago).
      let dataRecebimentoNF, dataRecebimentoBoleto, dataEnvioFinanceiro, dataPagamento, status;

      if (!isAtual) {
        // Meses anteriores: fluxo completo, já pago
        dataRecebimentoNF     = `${a}-${String(m).padStart(2,'0')}-03`;
        dataRecebimentoBoleto = `${a}-${String(m).padStart(2,'0')}-05`;
        dataEnvioFinanceiro   = `${a}-${String(m).padStart(2,'0')}-06`;
        dataPagamento         = venc.toISOString().slice(0, 10);
        status = 'Pago';
      } else {
        const cenario = exemploIdx++ % 4;
        if (cenario === 0) {
          // Cenário 1: boleto ainda não recebido, vencimento próximo (alerta crítico)
          dataRecebimentoNF = `${a}-${String(m).padStart(2,'0')}-03`;
          dataRecebimentoBoleto = null;
          dataEnvioFinanceiro = null;
          dataPagamento = null;
          status = 'Recebido';
        } else if (cenario === 1) {
          // Cenário 2: NF recebida depois do vencimento do boleto (alerta de atraso de processo)
          const vencPassado = new Date(venc); vencPassado.setDate(vencPassado.getDate() - 3);
          dataRecebimentoNF = new Date(venc.getTime() + 2*86400000).toISOString().slice(0,10);
          dataRecebimentoBoleto = vencPassado.toISOString().slice(0,10);
          dataEnvioFinanceiro = null;
          dataPagamento = null;
          status = 'Recebido';
        } else if (cenario === 2) {
          // Cenário 3: boleto recebido mas ainda não enviado ao financeiro
          dataRecebimentoNF = `${a}-${String(m).padStart(2,'0')}-03`;
          dataRecebimentoBoleto = `${a}-${String(m).padStart(2,'0')}-05`;
          dataEnvioFinanceiro = null;
          dataPagamento = null;
          status = 'Recebido';
        } else {
          // Cenário 4: fluxo completo e em dia
          dataRecebimentoNF = `${a}-${String(m).padStart(2,'0')}-03`;
          dataRecebimentoBoleto = `${a}-${String(m).padStart(2,'0')}-05`;
          dataEnvioFinanceiro = `${a}-${String(m).padStart(2,'0')}-06`;
          dataPagamento = null;
          status = 'Enviado ao Financeiro';
        }
      }

      movimentacoes.push({
        id_movimento:         `M${String(movId++).padStart(5,'0')}`,
        id_contrato:          c.id,
        mes:                  m,
        ano:                  a,
        valor_nota:           c.valor_mensal,
        numero_nf:            nf,
        numero_boleto:        boleto,
        data_emissao_nf:      `${a}-${String(m).padStart(2,'0')}-01`,
        data_recebimento_nf:  dataRecebimentoNF,
        data_recebimento_boleto: dataRecebimentoBoleto,
        data_envio_financeiro: dataEnvioFinanceiro,
        data_vencimento:      venc.toISOString().slice(0, 10),
        data_pagamento:       dataPagamento,
        status:               status,
        observacoes:          '',
        usuario:              c.responsavel,
      });
    }
  });

  return { fornecedores, contratos, movimentacoes };
})();
