// v15.1  –  teclas ‘Enter/Go/Next/Done’     28-abr-2025
document.addEventListener('DOMContentLoaded', main);

function main() {
  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycby9BdmtpHuyxQzyfMVNPIXisx_ADVo-Nod_HmTv-5ayEKzMjTDglmxTUqkI_ZeB8exN/exec';

  const $ = id => document.getElementById(id);
  const codigoInp  = $('codigoProduto');
  const taraInp    = $('pesoTaraKg');
  const pesoTotInp = $('pesoTotalKg');
  const btnSend    = $('registrarItemBtn');
  const statusDiv  = $('statusEnvio');
  const nomeProd   = $('nomeProdutoDisplay');
  const taraBox    = $('botoesTaraContainer');

  const overlay = $('overlayNomeUsuario');
  const modal   = $('modalNomeUsuario');
  const nomeInp = $('inputNomeUsuario');
  const salvaNm = $('salvarNomeUsuarioBtn');
  const nomeLbl = $('nomeUsuarioDisplay');

  let MAPA = {};
  let nomeUsuario = localStorage.getItem('inventarioGranelUsuario') || '';
  let letraSel = '';

  /* ---------- potes.json ---------- */
  fetch('potes.json').then(r => r.json()).then(arr => {
    arr.forEach(p => MAPA[p.codigo] = p);
  });

  /* ---------- nome usuário ---------- */
  if (!nomeUsuario) abrirModal();
  else mostrarNome();
  nomeLbl.addEventListener('click', abrirModal);
  salvaNm.addEventListener('click', salvaNome);
  nomeInp.addEventListener('keydown', e => {
    if (e.key === 'Enter') salvaNome();
  });
  function abrirModal() {
    overlay.style.display = modal.style.display = 'block';
    nomeInp.focus();
  }
  function salvaNome() {
    const n = nomeInp.value.trim();
    if (!n) return alert('Digite seu nome.');
    nomeUsuario = n;
    localStorage.setItem('inventarioGranelUsuario', n);
    mostrarNome();
    overlay.style.display = modal.style.display = 'none';
    updateBtn();
  }
  function mostrarNome() { nomeLbl.textContent = `Olá, ${nomeUsuario}!`; }

  /* ---------- tara rápida ---------- */
  taraBox.addEventListener('click', ev => {
    const b = ev.target.closest('.tara-button');
    if (!b) return;
    [...taraBox.children].forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    taraInp.value = Number(b.dataset.taraKg).toFixed(3).replace('0.000','');
    letraSel = b.dataset.letra || '';
    pesoTotInp.focus();
  });

  /* ---------- mover foco com Enter/Go ---------- */
  const goKeys = ['Enter','Go','Next','Done','Send'];
  codigoInp.addEventListener('keydown', e => {
    if (goKeys.includes(e.key)) {
      e.preventDefault();
      taraInp.focus();
      taraInp.select();
    }
  });
  taraInp.addEventListener('keydown', e => {
    if (goKeys.includes(e.key)) {
      e.preventDefault();
      pesoTotInp.focus();
      pesoTotInp.select();
    }
  });
  pesoTotInp.addEventListener('keydown', e => {
    if (goKeys.includes(e.key)) {
      e.preventDefault();
      btnSend.click();
    }
  });

  /* ---------- habilita/desabilita botão ---------- */
  [codigoInp, taraInp, pesoTotInp].forEach(el =>
    el.addEventListener('input', updateBtn));
  function updateBtn() {
    btnSend.disabled = !(nomeUsuario && codigoInp.value && pesoTotInp.value);
  }

  /* ---------- indicar nome do produto ---------- */
  codigoInp.addEventListener('blur', () => {
    const p = MAPA[codigoInp.value.trim()];
    nomeProd.textContent = p ? p.Nome : '';
  });

  /* ---------- enviar ---------- */
  btnSend.addEventListener('click', async () => {
    updateBtn();
    if (btnSend.disabled) return;

    const codigo    = codigoInp.value.trim();
    const tara      = parseFloat(taraInp.value.replace(',','.')) || 0;
    const pesoTot   = parseFloat(pesoTotInp.value.replace(',','.'));
    const pesoLiq   = +(pesoTot - tara).toFixed(3);

    const p = MAPA[codigo] || {};
    const fd = new FormData();
    fd.append('usuario',     nomeUsuario);
    fd.append('codigo',      codigo);
    fd.append('nomeProduto', p.Nome || '');
    fd.append('pesoLiquido', pesoLiq);
    fd.append('tara',        tara);
    fd.append('pesoTotal',   pesoTot);
    fd.append('letraPote',   letraSel || p.letra || '');

    statusDiv.textContent = 'Enviando…';
    statusDiv.className = 'sending';

    try {
      const r = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body:fd });
      const j = await r.json();
      if (j.result !== 'success') throw new Error(j.message);

      statusDiv.textContent = 'Enviado ✔';
      statusDiv.className = 'success';
      [codigoInp,taraInp,pesoTotInp].forEach(i=>i.value='');
      nomeProd.textContent = ''; letraSel='';
      [...taraBox.children].forEach(x=>x.classList.remove('selected'));
      updateBtn();
      codigoInp.focus();

    } catch (err) {
      statusDiv.textContent = 'Falha: '+err.message;
      statusDiv.className   = 'error';
    } finally {
      setTimeout(()=>statusDiv.textContent='',6000);
    }
  });
}
