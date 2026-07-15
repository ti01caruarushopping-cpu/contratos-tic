/**
 * utils.js — Utilitários compartilhados
 * Formatação, toast, modais, validação, exportação
 */

/* ── FORMATADORES ────────────────────────────────────────── */
const Fmt = {
  moeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  },
  data(s) {
    if (!s) return '—';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  },
  dataISO(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  },
  mesAno(mes, ano) {
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${nomes[(mes || 1) - 1]}/${ano}`;
  },
  mesNome(mes) {
    const n = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return n[(mes || 1) - 1];
  },
  diasRestantes(dataFim) {
    if (!dataFim) return null;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const fim  = new Date(dataFim);
    return Math.round((fim - hoje) / 86400000);
  },
  cnpj(v) {
    if (!v) return '';
    return v.replace(/\D/g,'')
      .replace(/^(\d{2})(\d)/,'$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
      .replace(/\.(\d{3})(\d)/,'.$1/$2')
      .replace(/(\d{4})(\d)/,'$1-$2')
      .slice(0,18);
  },
  telefone(v) {
    if (!v) return '';
    const d = v.replace(/\D/g,'');
    if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');
    return d.replace(/^(\d{2})(\d{4})(\d{4})$/,'($1) $2-$3');
  },
  initials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(' ');
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  },
  numero(v) {
    return new Intl.NumberFormat('pt-BR').format(v || 0);
  },
};

/* ── TOAST ───────────────────────────────────────────────── */
const Toast = {
  _container: null,
  _init() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.id = 'toast-container';
        document.body.appendChild(this._container);
      }
    }
  },
  show(msg, type = 'info', duration = 3000) {
    this._init();
    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
    this._container.appendChild(el);
    setTimeout(() => el.remove(), duration + 300);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 4000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); },
};

/* ── MODAL ENGINE ────────────────────────────────────────── */
const Modal = {
  _stack: [],

  open(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    this._stack.push(id);
    // Fechar ao clicar no overlay
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this.close(id);
    }, { once: true });
  },

  close(id) {
    const overlay = id ? document.getElementById(id) : document.getElementById(this._stack[this._stack.length - 1]);
    if (!overlay) return;
    overlay.classList.remove('open');
    this._stack = this._stack.filter(i => i !== overlay.id);
    if (this._stack.length === 0) document.body.style.overflow = '';
  },

  closeAll() {
    this._stack.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('open');
    });
    this._stack = [];
    document.body.style.overflow = '';
  },

  confirm(msg, onConfirm, onCancel) {
    let overlay = document.getElementById('modal-confirm');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-confirm';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal modal-sm">
          <div class="modal-header">
            <div>
              <div class="modal-title">Confirmar ação</div>
            </div>
          </div>
          <div class="modal-body">
            <p id="confirm-msg" style="color:var(--c-text-2);font-size:14px;line-height:1.6"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
            <button class="btn btn-danger"    id="confirm-ok">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById('confirm-msg').textContent = msg;
    document.getElementById('confirm-ok').onclick = () => { this.close('modal-confirm'); onConfirm?.(); };
    document.getElementById('confirm-cancel').onclick = () => { this.close('modal-confirm'); onCancel?.(); };
    this.open('modal-confirm');
  },
};

/* ── STATUS HELPERS ──────────────────────────────────────── */
const Status = {
  contrato: {
    'Ativo':        { badge: 'badge-success', label: 'Ativo' },
    'Suspenso':     { badge: 'badge-warning', label: 'Suspenso' },
    'Cancelado':    { badge: 'badge-danger',  label: 'Cancelado' },
    'Em renovação': { badge: 'badge-info',    label: 'Em renovação' },
  },
  movimentacao: {
    'Pendente':              { badge: 'badge-neutral', label: 'Pendente' },
    'Recebido':              { badge: 'badge-info',    label: 'Recebido' },
    'Enviado ao Financeiro': { badge: 'badge-purple',  label: 'Enviado' },
    'Pago':                  { badge: 'badge-success', label: 'Pago' },
    'Em atraso':             { badge: 'badge-danger',  label: 'Em atraso' },
  },

  badgeContrato(s)      { const st = this.contrato[s]      || { badge:'badge-neutral', label: s||'—' }; return `<span class="badge ${st.badge}">${st.label}</span>`; },
  badgeMovimentacao(s)  { const st = this.movimentacao[s]  || { badge:'badge-neutral', label: s||'—' }; return `<span class="badge ${st.badge}">${st.label}</span>`; },

  vencimentoContrato(dataFim, status) {
    if (status !== 'Ativo') return '';
    const dias = Fmt.diasRestantes(dataFim);
    if (dias === null) return '';
    if (dias < 0)  return `<span class="badge badge-danger">Vencido</span>`;
    if (dias <= 7)  return `<span class="badge badge-danger">${dias}d restantes</span>`;
    if (dias <= 15) return `<span class="badge badge-warning">${dias}d restantes</span>`;
    if (dias <= 30) return `<span class="badge badge-info">${dias}d restantes</span>`;
    return '';
  },
};

/* ── VALIDAÇÃO ───────────────────────────────────────────── */
const Validate = {
  required(v) { return v !== null && v !== undefined && String(v).trim() !== ''; },
  email(v)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },
  cnpj(v)     { return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v); },
  positivo(v) { return !isNaN(v) && parseFloat(v) > 0; },

  form(formEl) {
    let ok = true;
    formEl.querySelectorAll('[required]').forEach(el => {
      const valid = Validate.required(el.value);
      el.style.borderColor = valid ? '' : 'var(--c-danger)';
      if (!valid) ok = false;
    });
    return ok;
  },
};

/* ── MÁSCARA MONETÁRIA ───────────────────────────────────── */
function maskMoeda(input) {
  input.addEventListener('input', function () {
    let v = this.value.replace(/\D/g,'');
    if (!v) { this.value = ''; return; }
    v = (parseInt(v) / 100).toFixed(2);
    this.value = 'R$ ' + v.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  });
}

function parseMoeda(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[R$\s.]/g,'').replace(',','.')) || 0;
}

function maskCnpj(input) {
  input.addEventListener('input', function () {
    this.value = Fmt.cnpj(this.value);
  });
}

function maskTel(input) {
  input.addEventListener('input', function () {
    this.value = Fmt.telefone(this.value);
  });
}

/* ── EXPORTAÇÃO ──────────────────────────────────────────── */
const Export = {
  csv(data, filename) {
    if (!data.length) return Toast.warning('Sem dados para exportar.');
    const headers = Object.keys(data[0]);
    const rows    = data.map(r => headers.map(h => `"${(r[h]??'').toString().replace(/"/g,'""')}"`).join(','));
    const csv     = [headers.join(','), ...rows].join('\n');
    const blob    = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    _download(blob, filename + '.csv');
    Toast.success('CSV exportado com sucesso.');
  },

  json(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    _download(blob, filename + '.json');
    Toast.success('JSON exportado.');
  },

  tabelaHTML(title, headers, rows) {
    const trs = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>${title}</title>
<style>
  body{font-family:Inter,sans-serif;font-size:13px;color:#0f172a;padding:24px}
  h1{font-size:18px;margin-bottom:16px;color:#1E3A5F}
  table{width:100%;border-collapse:collapse}
  th{background:#1E3A5F;color:#fff;padding:8px 12px;text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}
  tr:nth-child(even) td{background:#f8fafc}
  .footer{margin-top:24px;font-size:11px;color:#94a3b8}
</style></head><body>
<h1>${title}</h1>
<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
<tbody>${trs}</tbody></table>
<div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} · Sistema de Gestão de Contratos TI</div>
</body></html>`;
  },

  imprimir(htmlContent) {
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(htmlContent);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  },
};

function _download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── LOADING OVERLAY ─────────────────────────────────────── */
const Loading = {
  show(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.dataset._origContent = el.innerHTML;
    el.disabled = true;
    el.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> Aguarde...`;
  },
  hide(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.disabled = false;
    if (el.dataset._origContent) el.innerHTML = el.dataset._origContent;
  },
};

/* ── ORDENAÇÃO DE TABELA ─────────────────────────────────── */
function sortTable(data, col, dir) {
  return [...data].sort((a, b) => {
    let va = a[col] ?? '', vb = b[col] ?? '';
    if (!isNaN(va) && !isNaN(vb)) { va = parseFloat(va); vb = parseFloat(vb); }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

/* ── PAGINAÇÃO ───────────────────────────────────────────── */
class Paginator {
  constructor(perPage = 15) {
    this.perPage  = perPage;
    this.page     = 1;
    this.total    = 0;
  }
  setTotal(n) { this.total = n; this.page = Math.min(this.page, this.totalPages || 1); }
  get totalPages() { return Math.max(1, Math.ceil(this.total / this.perPage)); }
  slice(data) {
    const start = (this.page - 1) * this.perPage;
    return data.slice(start, start + this.perPage);
  }
  renderHTML(onPageChange) {
    const tp = this.totalPages;
    if (tp <= 1) return '';
    const p = this.page;
    let btns = '';
    // Prev
    btns += `<button class="page-btn" ${p===1?'disabled':''} onclick="(${onPageChange})(${p-1})">‹</button>`;
    // Pages
    const pages = new Set([1, tp, p, p-1, p+1].filter(x => x>=1 && x<=tp));
    const sorted = [...pages].sort((a,b)=>a-b);
    let last = 0;
    sorted.forEach(pg => {
      if (last && pg - last > 1) btns += `<span class="page-btn" style="border:none;cursor:default">…</span>`;
      btns += `<button class="page-btn ${pg===p?'active':''}" onclick="(${onPageChange})(${pg})">${pg}</button>`;
      last = pg;
    });
    // Next
    btns += `<button class="page-btn" ${p===tp?'disabled':''} onclick="(${onPageChange})(${p+1})">›</button>`;
    return `<div class="pagination">${btns}</div>`;
  }
}

/* ── DEBOUNCE ────────────────────────────────────────────── */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── SIDEBAR & TEMA ──────────────────────────────────────── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Colapsar
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    const collapsed = localStorage.getItem('sidebar-collapsed') === '1';
    if (collapsed) sidebar.classList.add('collapsed');
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
  }

  // Marcar item ativo
  const path = location.pathname.split('/').pop() || 'index.html';
  sidebar.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === path);
  });
}

function initTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }
}

/* ── BUSCA GLOBAL ────────────────────────────────────────── */
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `contratos.html?busca=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

/* ── TEMPLATE SIDEBAR HTML ───────────────────────────────── */
function getSidebarHTML() {
  return `
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark">TI</div>
      <div class="sidebar-logo-text">
        <strong>ContratosGI</strong>
        <span>Gestão de TI</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <div class="sidebar-section-label">Principal</div>
        <a href="index.html" class="nav-item" data-page="index.html">
          ${icon('grid')}
          <span class="nav-item-text">Dashboard</span>
        </a>
        <a href="contratos.html" class="nav-item" data-page="contratos.html">
          ${icon('file-text')}
          <span class="nav-item-text">Contratos</span>
        </a>
        <a href="financeiro.html" class="nav-item" data-page="financeiro.html">
          ${icon('dollar-sign')}
          <span class="nav-item-text">Financeiro</span>
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-label">Gestão</div>
        <a href="fornecedores.html" class="nav-item" data-page="fornecedores.html">
          ${icon('briefcase')}
          <span class="nav-item-text">Fornecedores</span>
        </a>
        <a href="agenda.html" class="nav-item" data-page="agenda.html">
          ${icon('calendar')}
          <span class="nav-item-text">Agenda</span>
        </a>
        <a href="relatorios.html" class="nav-item" data-page="relatorios.html">
          ${icon('bar-chart-2')}
          <span class="nav-item-text">Relatórios</span>
        </a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-label">Sistema</div>
        <a href="configuracoes.html" class="nav-item" data-page="configuracoes.html">
          ${icon('settings')}
          <span class="nav-item-text">Configurações</span>
        </a>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user-avatar" id="user-avatar">R</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" id="user-name">Rafael</div>
        <div class="sidebar-user-role">Analista de TI</div>
      </div>
    </div>
  </aside>

  <button class="sidebar-toggle" id="sidebar-toggle" data-tooltip="Recolher menu">
    <svg class="toggle-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  </button>

  <div id="toast-container"></div>`;
}

function getNavbarHTML(title, breadcrumb = []) {
  const bc = breadcrumb.map((b, i) =>
    i < breadcrumb.length - 1
      ? `<a href="${b.url || '#'}">${b.label}</a><span>/</span>`
      : `<span class="active">${b.label}</span>`
  ).join('');

  return `
  <nav class="navbar">
    <div class="navbar-breadcrumb">
      ${bc || `<span class="active">${title}</span>`}
    </div>
    <div class="navbar-spacer"></div>
    <div class="navbar-search">
      ${icon('search', 14)}
      <input type="text" id="global-search" placeholder="Buscar contrato, fornecedor…" />
    </div>
    <div class="navbar-actions">
      <button class="navbar-btn" id="theme-toggle" data-tooltip="Alternar tema">
        ${icon('moon', 16)}
      </button>
      <div style="position:relative">
        <button class="navbar-btn" id="btn-notif" data-tooltip="Notificações">
          ${icon('bell', 16)}
          <span class="dot" id="notif-dot"></span>
        </button>
        <!-- Painel de notificações -->
        <div id="notif-panel" style="
          display:none;position:absolute;top:calc(100% + 8px);right:0;
          width:360px;background:var(--c-surface);border:1px solid var(--c-border);
          border-radius:var(--r-lg);box-shadow:var(--sh-xl);z-index:200;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;
               padding:14px 16px;border-bottom:1px solid var(--c-border)">
            <div style="font-size:14px;font-weight:700;color:var(--c-text-1)">Notificações</div>
            <span id="notif-badge" style="font-size:11px;font-weight:600;
              background:var(--c-danger);color:#fff;padding:2px 8px;border-radius:99px"></span>
          </div>
          <div id="notif-list" style="max-height:380px;overflow-y:auto">
            <div style="padding:32px;text-align:center;color:var(--c-text-3);font-size:13px">
              <div style="margin-bottom:8px;opacity:.4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              Carregando alertas…
            </div>
          </div>
          <div style="padding:10px 16px;border-top:1px solid var(--c-border);background:var(--c-ice)">
            <a href="financeiro.html" style="font-size:12px;color:var(--c-blue-light);font-weight:600">
              Ver todos no Financeiro →
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>`;
}

/* ── SISTEMA DE NOTIFICAÇÕES ─────────────────────────────── */
const Notif = {
  _loaded: false,

  async carregar() {
    if (this._loaded) return;
    this._loaded = true;
    try {
      const [contratos, movs] = await Promise.all([
        API.listarContratos(),
        _todasMovimentacoes(),
      ]);
      this._renderizar(contratos, movs);
    } catch(e) {
      document.getElementById('notif-list').innerHTML =
        `<div style="padding:16px;font-size:12px;color:var(--c-text-3)">Não foi possível carregar alertas.</div>`;
    }
  },

  _renderizar(contratos, movs) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const itens = [];

    /* 1. Boletos não recebidos com vencimento ≤ 7 dias */
    movs.forEach(m => {
      if (m.data_recebimento_boleto) return;
      if (!m.data_vencimento) return;
      const dias = Math.round((new Date(m.data_vencimento) - hoje) / 86400000);
      if (dias > 7) return;
      const c = contratos.find(x => x.id === m.id_contrato);
      itens.push({
        tipo: 'danger',
        icone: 'alert-triangle',
        titulo: `Boleto não recebido — ${c?.fornecedor || m.id_contrato}`,
        detalhe: dias < 0
          ? `Venceu há ${Math.abs(dias)} dia(s) · ${Fmt.moeda(m.valor_nota)}`
          : dias === 0
          ? `Vence hoje · ${Fmt.moeda(m.valor_nota)}`
          : `Vence em ${dias} dia(s) · ${Fmt.moeda(m.valor_nota)}`,
        link: `financeiro.html?mes=${m.mes}&ano=${m.ano}`,
        prioridade: dias < 0 ? 0 : 1,
      });
    });

    /* 2. NF recebida após o vencimento do boleto */
    movs.forEach(m => {
      if (!m.data_recebimento_nf || !m.data_vencimento) return;
      if (new Date(m.data_recebimento_nf) <= new Date(m.data_vencimento)) return;
      const c = contratos.find(x => x.id === m.id_contrato);
      itens.push({
        tipo: 'warning',
        icone: 'info',
        titulo: `NF recebida após vencimento — ${c?.fornecedor || m.id_contrato}`,
        detalhe: `NF em ${Fmt.data(m.data_recebimento_nf)} · Venceu em ${Fmt.data(m.data_vencimento)}`,
        link: `financeiro.html?mes=${m.mes}&ano=${m.ano}`,
        prioridade: 2,
      });
    });

    /* 3. Boleto recebido mas não enviado ao financeiro */
    movs.forEach(m => {
      if (!m.data_recebimento_boleto || m.data_envio_financeiro) return;
      const c = contratos.find(x => x.id === m.id_contrato);
      itens.push({
        tipo: 'info',
        icone: 'clock',
        titulo: `Boleto aguardando envio ao financeiro`,
        detalhe: `${c?.fornecedor || m.id_contrato} · ${Fmt.moeda(m.valor_nota)}`,
        link: `financeiro.html?mes=${m.mes}&ano=${m.ano}`,
        prioridade: 3,
      });
    });

    /* 4. Contratos vencendo em ≤ 30 dias */
    contratos.forEach(c => {
      if (c.status !== 'Ativo') return;
      const dias = Fmt.diasRestantes(c.data_fim);
      if (dias === null || dias < 0 || dias > 30) return;
      itens.push({
        tipo: dias <= 7 ? 'danger' : 'warning',
        icone: 'calendar',
        titulo: `Contrato vencendo — ${c.fornecedor}`,
        detalhe: dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s) · ${Fmt.data(c.data_fim)}`,
        link: `contratos.html?id=${c.id}`,
        prioridade: 4,
      });
    });

    itens.sort((a, b) => a.prioridade - b.prioridade);

    const cores = { danger:'var(--c-danger)', warning:'var(--c-warning)', info:'var(--c-teal)' };
    const bgs   = { danger:'var(--c-danger-bg)', warning:'var(--c-warning-bg)', info:'var(--c-info-bg)' };

    const dot = document.getElementById('notif-dot');
    const badge = document.getElementById('notif-badge');
    if (dot)   dot.style.display = itens.length ? '' : 'none';
    if (badge) { badge.textContent = itens.length || ''; badge.style.display = itens.length ? '' : 'none'; }

    const list = document.getElementById('notif-list');
    if (!list) return;

    if (!itens.length) {
      list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--c-text-3);font-size:13px">
        <div style="margin-bottom:8px;color:var(--c-success);opacity:.7">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>Tudo em dia! Nenhum alerta pendente.</div>`;
      return;
    }

    list.innerHTML = itens.map(it => `
      <a href="${it.link}" style="display:flex;align-items:flex-start;gap:10px;
         padding:12px 16px;border-bottom:1px solid var(--c-border);
         text-decoration:none;transition:background .15s"
         onmouseover="this.style.background='var(--c-ice)'"
         onmouseout="this.style.background=''">
        <div style="width:32px;height:32px;border-radius:var(--r-md);flex-shrink:0;
             background:${bgs[it.tipo]};display:flex;align-items:center;
             justify-content:center;color:${cores[it.tipo]};margin-top:2px">
          ${icon(it.icone, 15)}
        </div>
        <div style="overflow:hidden">
          <div style="font-size:12px;font-weight:600;color:var(--c-text-1);
               white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.titulo}</div>
          <div style="font-size:11px;color:var(--c-text-3);margin-top:2px">${it.detalhe}</div>
        </div>
      </a>`).join('');
  },
};

/* helper: busca movimentações de todos os contratos */
async function _todasMovimentacoes() {
  const contratos = await API.listarContratos();
  const all = await Promise.all(contratos.map(c => API.listarMovimentacoes(c.id)));
  return all.flat();
}

/* ── INIT GERAL ──────────────────────────────────────────── */
function initApp() {
  initSidebar();
  initTheme();
  initGlobalSearch();

  // ESC fecha modais
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      Modal.close();
      // fecha painel de notificações
      const p = document.getElementById('notif-panel');
      if (p) p.style.display = 'none';
    }
  });

  // Fechar modal pelo botão .modal-close
  document.addEventListener('click', e => {
    const btn = e.target.closest('.modal-close');
    if (btn) Modal.close(btn.closest('.modal-overlay')?.id);
  });

  // Sino de notificações — abre/fecha painel e carrega alertas
  document.addEventListener('click', e => {
    const btnNotif = e.target.closest('#btn-notif');
    const panel    = document.getElementById('notif-panel');
    if (!panel) return;

    if (btnNotif) {
      const aberto = panel.style.display !== 'none';
      panel.style.display = aberto ? 'none' : 'block';
      if (!aberto) Notif.carregar();
      return;
    }
    // Clique fora fecha
    if (!panel.contains(e.target)) {
      panel.style.display = 'none';
    }
  });
}
function icon(name, size = 18) {
  const s = size;
  const icons = {
    'grid':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'file-text':   `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    'dollar-sign': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    'briefcase':   `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>`,
    'calendar':    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'bar-chart-2': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    'settings':    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
    'search':      `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'moon':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
    'bell':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
    'plus':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    'edit':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    'trash':       `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
    'eye':         `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    'download':    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    'filter':      `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    'refresh':     `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
    'x':           `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    'check':       `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    'alert-triangle':`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    'info':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    'trending-up': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    'package':     `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    'users':       `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    'clock':       `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    'credit-card': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    'link':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
    'copy':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
    'save':        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  };
  return icons[name] || `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}

/* ── INIT GERAL ──────────────────────────────────────────── */
function initApp() {
  initSidebar();
  initTheme();
  initGlobalSearch();

  // ESC fecha modais
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') Modal.close();
  });

  // Fechar modal pelo botão .modal-close
  document.addEventListener('click', e => {
    const btn = e.target.closest('.modal-close');
    if (btn) Modal.close(btn.closest('.modal-overlay')?.id);
  });
}
