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

  const toggle = document.getElementById('sidebar-toggle');

  // Aplicar estado inicial salvo
  const savedCollapsed = localStorage.getItem('sidebar-collapsed') === '1';
  _setSidebarState(sidebar, savedCollapsed);

  // Botão de colapsar/expandir
  if (toggle) {
    toggle.addEventListener('click', () => {
      const nowCollapsed = !sidebar.classList.contains('collapsed');
      _setSidebarState(sidebar, nowCollapsed);
      localStorage.setItem('sidebar-collapsed', nowCollapsed ? '1' : '0');
    });
  }

  // Marcar item ativo no menu
  const path = location.pathname.split('/').pop() || 'index.html';
  sidebar.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === path);
  });

  // Preencher dados do usuário logado a partir da sessão
  // (feito aqui, após o HTML do sidebar já estar no DOM)
  _preencherUsuarioSidebar();
}

/**
 * Lê a sessão e preenche nome, avatar e cargo no sidebar-footer.
 * Chamado em initSidebar() — garante que os elementos já existem no DOM.
 */
function _preencherUsuarioSidebar() {
  try {
    const raw = sessionStorage.getItem('cgi_sessao');
    if (!raw) return;
    const s = JSON.parse(raw);

    const avatarEl = document.getElementById('user-avatar');
    const nomeEl   = document.getElementById('user-name');
    const roleEl   = document.getElementById('user-role');

    if (avatarEl) avatarEl.textContent = s.avatar || '?';
    if (nomeEl)   nomeEl.textContent   = s.nome   || 'Usuário';
    if (roleEl)   roleEl.textContent   = s.cargo  || '';
  } catch(_) {
    // silencioso — não quebra o resto da página
  }
}

/**
 * Aplica ou remove o estado colapsado do sidebar E do main-content.
 *
 * O seletor CSS ".sidebar.collapsed ~ .main-content" não funciona aqui
 * porque o #sidebar está DENTRO de #sidebar-root, e o .main-content é
 * irmão de #sidebar-root — não do #sidebar diretamente.
 *
 * Solução: aplicar classe 'sidebar-collapsed' no body (acessível globalmente)
 * E setar o width/margin-left do main-content via JS inline também,
 * como garantia extra em todos os browsers.
 */
function _setSidebarState(sidebar, collapsed) {
  // 1. Classe no .sidebar para animações internas (ícones, texto)
  if (collapsed) {
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
  }

  // 2. Classe no body — usada pelo CSS (body.sidebar-collapsed .main-content)
  if (collapsed) {
    document.body.classList.add('sidebar-collapsed');
  } else {
    document.body.classList.remove('sidebar-collapsed');
  }

  // 3. Setar width e margin-left diretamente no .main-content via JS
  //    (mais confiável que seletores CSS de irmão com divs intermediárias)
  const main = document.querySelector('.main-content, #main-content');
  if (main) {
    const sidebarW    = collapsed ? '64px' : '240px';
    main.style.marginLeft = sidebarW;
    main.style.width      = `calc(100% - ${sidebarW})`;
    main.style.maxWidth   = `calc(100% - ${sidebarW})`;
  }

  // 4. Ajustar posição do botão toggle
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    toggle.style.left = collapsed
      ? 'calc(64px - 12px)'
      : 'calc(240px - 12px)';
    const ico = toggle.querySelector('.toggle-icon');
    if (ico) ico.style.transform = collapsed ? 'rotate(180deg)' : '';
  }
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
      <img src="data:image/png;base64,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" alt="Caruaru Shopping"
           style="width:36px;height:36px;object-fit:contain;border-radius:6px;flex-shrink:0" />
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
      <div class="sidebar-user-avatar" id="user-avatar">?</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" id="user-name">Carregando…</div>
        <div class="sidebar-user-role" id="user-role"></div>
      </div>
      <button onclick="if(typeof Sessao!=='undefined')Sessao.logout()"
              id="btn-logout-sidebar"
              style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);
                     padding:4px;border-radius:6px;margin-left:auto;flex-shrink:0;display:flex"
              title="Sair do sistema">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
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
    <img src="data:image/png;base64,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" alt="Caruaru Shopping"
         style="height:32px;width:auto;object-fit:contain;flex-shrink:0;margin-right:4px" />
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
