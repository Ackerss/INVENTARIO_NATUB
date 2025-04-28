// v15 – full features + FormData   (28-abr-2025)
document.addEventListener('DOMContentLoaded', main);

function main() {
  /* ⇣  cole aqui a URL /exec da Implantação ⇣ */
  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycby9BdmtpHuyxQzyfMVNPIXisx_ADVo-Nod_HmTv-5ayEKzMjTDglmxTUqkI_ZeB8exN/exec';

  /* ---------- refs DOM ---------- */
  const $  = id => document.getElementById(id);
  const codigoInp   = $('codigoProduto');
  const taraInp     = $('pesoTaraKg');
  const pesoTotInp  = $('pesoTotalKg');
  const btnEnviar   = $('registrarItemBtn');
  const statusDiv   = $('statusEnvio');
  const nomeProdDiv = $('nomeProdutoDisplay');
  const taraBtnsBox = $('botoesTaraContainer');

  /* modal nome usuário */
  const overlay   = $('overlayNomeUsuario');
  const modal     = $('modalNomeUsuario');
  const nomeInp   = $('inputNomeUsuario');
  const salvarBtn = $('salvarNomeUsuarioBtn');
  const nomeSpan  = $('nomeUsuarioDisplay');

  let MAPA = {};                // codigo → objeto com Nome, tara, letra
  let letraSelecionada = '';
  let nomeUsuario = localStorage.getItem('inventarioGranelUsuario') || '';

  /* ----- carrega potes.json ----- */
  fetch('potes.json')
    .then(r => r.json())
    .then(arr => { arr.forEach(p => MAPA[p.codigo] = p); });

  /* ----- pede nome se necessário ----- */
  if (!nomeUsuario) abrirModalNome();
  else mostrarNome();

  function abrirModalNome() {
    overlay.style.display = modal.style.display = 'block';
    nomeInp.focus();
  }
  function fecharModalNome() {
    overlay.style.display = modal.style.display = 'none';
  }
  function salvarNome() {
    const n = nomeInp.value.trim();
    if (!n) { alert('Digite seu nome.'); return; }
    nomeUsuario = n;
    localStorage.setItem('inventarioGranelUsuario', n);
    mostrarNome();
    fecharModalNome();
    atualizarBotao();
  }
  function mostrarNome() {
    nomeSpan.textContent = `Olá, ${nomeUsuario}!`;
  }
  salvarBtn.addEventListener('click', salvarNome);
  nomeInp.addEventListener('keydown', e => { if (e.key === 'Enter') salvarNome(); });
  nomeSpan.addEventListener('click', abrirModalNome);

  /* ----- tara rápida ----- */
  taraBtnsBox.addEventListener('click', ev => {
    const btn = ev.target.closest('.tara-button');
    if (!btn) return;

    [...taraBtnsBox.children].forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    letraSelecionada = btn.dataset.letra || '';
    const tara = Number(btn.dataset.taraKg);
    taraInp.value = tara ? tara.toFixed(3) : '';
    pesoTotInp.focus();
  });

  /* ----- exibe nome do produto quando sai do campo código ----- */
  codigoInp.addEventListener('blur', () => {
    const p = MAPA[codigoInp.value.trim()];
    nomeProdDiv.textContent = p ? p.Nome : '';
    atualizarBotao();
  });

  /* ----- habilita botão se dados mínimos ok ----- */
  function atualizarBotao() {
    btnEnviar.disabled = !(
      nomeUsuario &&
      codigoInp.value.trim() &&
      pesoTotInp.value.trim()
    );
  }
  [codigoInp, pesoTotInp, taraInp].forEach(el =>
      el.addEventListener('input', atualizarBotao));

  /* ----- envio ----- */
  btnEnviar.addEventListener('click', async () => {
    atualizarBotao();
    if (btnEnviar.disabled) return;

    const codigo    = codigoInp.value.trim();
    const pesoTotal = Number(pesoTotInp.value.replace(',', '.'));
    const tara      = Number(taraInp.value.replace(',', '.')) || 0;
    const pesoLiq   = +(pesoTotal - tara).toFixed(3);

    const pInfo = MAPA[codigo] || {};
    const fd = new FormData();
    fd.append('usuario',     nomeUsuario);
    fd.append('codigo',      codigo);
    fd.append('nomeProduto', pInfo.Nome || '');
    fd.append('pesoLiquido', pesoLiq);
    fd.append('tara',        tara);
    fd.append('pesoTotal',   pesoTotal);
    fd.append('letraPote',   letraSelecionada || pInfo.letra || '');

    statusDiv.textContent = 'Enviando…';
    statusDiv.className   = 'sending';

    try {
      const r   = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body:fd });
      const res = await r.json();
      if (res.result !== 'success')
        throw new Error(res.message || 'Erro desconhecido');

      statusDiv.textContent = 'Enviado ✔';
      statusDiv.className   = 'success';

      /* limpa formulário */
      [codigoInp, taraInp, pesoTotInp].forEach(i => i.value='');
      nomeProdDiv.textContent = '';
      [...taraBtnsBox.children].forEach(b => b.classList.remove('selected'));
      letraSelecionada = '';
      atualizarBotao();

    } catch (err) {
      statusDiv.textContent = 'Falha: '+err.message;
      statusDiv.className   = 'error';
    } finally {
      setTimeout(() => { statusDiv.textContent=''; }, 6000);
    }
  });
}
