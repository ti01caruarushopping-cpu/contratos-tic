/**
 * auth.js — Proteção de rotas e dados da sessão
 * Incluir em TODAS as páginas (exceto login.html) ANTES de utils.js
 */

/* ── VERIFICAR SESSÃO ──────────────────────────────────── */
(function guardRoute() {
  const raw = sessionStorage.getItem('cgi_sessao');
  if (!raw) {
    // Não logado → redireciona para login
    window.location.replace('login.html');
    throw new Error('Não autenticado');
  }
  try {
    const dados = JSON.parse(raw);
    if (!dados.usuario || !dados.loginAt) throw new Error('Sessão inválida');
    // Expira após 8 horas
    const diff = (Date.now() - new Date(dados.loginAt)) / 3600000;
    if (diff > 8) {
      sessionStorage.removeItem('cgi_sessao');
      window.location.replace('login.html');
      throw new Error('Sessão expirada');
    }
  } catch(e) {
    sessionStorage.removeItem('cgi_sessao');
    window.location.replace('login.html');
    throw e;
  }
})();

/* ── DADOS DO USUÁRIO LOGADO ───────────────────────────── */
const Sessao = {
  get dados() {
    try { return JSON.parse(sessionStorage.getItem('cgi_sessao') || '{}'); }
    catch(_) { return {}; }
  },
  get nome()   { return this.dados.nome   || 'Usuário'; },
  get cargo()  { return this.dados.cargo  || ''; },
  get avatar() { return this.dados.avatar || '?'; },
  get perfil() { return this.dados.perfil || 'analista'; },

  logout() {
    sessionStorage.removeItem('cgi_sessao');
    window.location.replace('login.html');
  },
};
