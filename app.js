// v14 – POST via FormData (requisição simples, sem pre-flight)
document.addEventListener('DOMContentLoaded', mainApp);

async function mainApp() {
  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycby9BdmtpHuyxQzyfMVNPIXisx_ADVo-Nod_HmTv-5ayEKzMjTDglmxTUqkI_ZeB8exN/exec';

  /* -------- referências -------- */
  const $ = id => document.getElementById(id);
  const codigoInput  = $('codigoProduto');
  const pesoTotalInp = $('pesoTotalKg');
  const taraInp      = $('pesoTaraKg');
  const btnEnviar    = $('registrarItemBtn');
  const statusDiv    = $('statusEnvio');
  const nomeProdDiv  = $('nomeProdutoDisplay');

  /* -------- estado mínimo -------- */
  let MAPA_PRODUTOS = {};
  let nomeUsuario   = localStorage.getItem('inventarioGranelUsuario') || '';

  /* -------- carrega potes.json -------- */
  fetch('potes.json')
    .then(r => r.json())
    .then(arr => {
      arr.forEach(p => MAPA_PRODUTOS[p.codigo] = p);
    });

  /* -------- evento enviar -------- */
  btnEnviar.addEventListener('click', async () => {
    if (!nomeUsuario) {
      alert('Defina seu nome (campo topo).');
      return;
    }

    const codigo    = codigoInput.value.trim();
    const pesoTotal = Number(pesoTotalInp.value.replace(',', '.'));
    const tara      = Number(taraInp.value.replace(',', '.'));
    const pesoLiq   = +(pesoTotal - tara).toFixed(3);

    if (!codigo || isNaN(pesoTotal)) {
      alert('Preencha código e peso.');
      return;
    }

    const fd = new FormData();
    fd.append('usuario',     nomeUsuario);
    fd.append('codigo',      codigo);
    fd.append('nomeProduto', MAPA_PRODUTOS[codigo]?.Nome || '');
    fd.append('pesoLiquido', pesoLiq);
    fd.append('tara',        tara);
    fd.append('pesoTotal',   pesoTotal);
    fd.append('letraPote',   MAPA_PRODUTOS[codigo]?.letra || '');

    statusDiv.textContent = 'Enviando…';
    statusDiv.className   = 'sending';

    try {
      const resp = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: fd });
      const data = await resp.json();

      if (data.result !== 'success')
        throw new Error(data.message || 'Erro desconhecido');

      statusDiv.textContent = 'Enviado ✔';
      statusDiv.className   = 'success';

      /* limpar campos */
      pesoTotalInp.value = '';
      taraInp.value      = '';
      codigoInput.value  = '';
      nomeProdDiv.textContent = '';

    } catch (err) {
      statusDiv.textContent = 'Falha: ' + err.message;
      statusDiv.className   = 'error';
    } finally {
      setTimeout(() => { statusDiv.textContent=''; }, 6000);
    }
  });

  /* -------- mostra nome do produto automático -------- */
  codigoInput.addEventListener('blur', () => {
    const p = MAPA_PRODUTOS[codigoInput.value.trim()];
    nomeProdDiv.textContent = p ? p.Nome : '';
  });
}
