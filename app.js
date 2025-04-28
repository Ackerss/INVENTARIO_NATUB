/* ========= CONFIG ========= */
// !!! URL ATUALIZADO PARA O SCRIPT NA NOVA CONTA GOOGLE !!!
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxuL80lvJUIXmOQFLD2B5vz6a0HN8I1fmNneOwrJfugknTjWNUd2KWvAss0UoI29MZu/exec';
const APP_VERSION = '28-abr-2025 r5 - Nova Conta Google'; // Versão atualizada para referência

/* ========= VARS ========= */
const ITENS_KEY = 'inv_granel_itens';
const ITENS_ENVIADOS_KEY = 'inv_granel_itens_enviados';
let nomeUsuario = '', enviando = false, letraPoteSel = 'Nenhuma', itens = [], itensEnviados = [], MAPA = {};

/* refs DOM */
const $ = id => document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'), totalInp=$('pesoTotalKg'),
      btnReg=$('registrarItemBtn'), tbody=$('listaItensBody'),
      letras=$('botoesTaraContainer'), status=$('statusEnvio'),
      nomeDisp=$('nomeUsuarioDisplay'), modal=$('modalNomeUsuario'),
      overlay=$('overlayNomeUsuario'), inpNome=$('inputNomeUsuario'),
      spanLetra=$('letraPoteSelecionado'), enviarTodosBtn=$('enviarTodosBtn');

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  console.log('App carregado:', APP_VERSION);
  await carregaMapa();
  carregaLocais();
  pedeNome();
  addListeners();
});

/* ---------- MAPA PRODUTOS ---------- */
async function carregaMapa(){
  try {
    const r = await fetch('potes.json'); // Certifique-se que potes.json está acessível
    if (!r.ok) throw new Error(`Erro ao carregar potes.json: ${r.statusText}`);
    const potesData = await r.json();
    MAPA = Object.create(null); // Reinicia o mapa
    potesData.forEach(p => {
        // Garante que o código seja tratado como string para consistência na busca
        if (p.codigo !== undefined && p.codigo !== null) {
             MAPA[String(p.codigo).trim()] = { nome: p.Nome, tara: p.tara, letra: p.letra };
        }
    });
    console.log('Mapa de potes carregado:', Object.keys(MAPA).length, 'itens.');
  } catch (error) {
      console.error('Falha ao carregar ou processar potes.json:', error);
      alert('Erro crítico: Não foi possível carregar a lista de produtos (potes.json). Verifique a conexão e o arquivo.');
  }
}


/* ---------- NOME ---------- */
function pedeNome(){
  nomeUsuario = localStorage.getItem('inv_nome') || '';
  if(!nomeUsuario){
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      inpNome.focus();
  }
  nomeDisp.textContent = nomeUsuario ? `Olá, ${nomeUsuario}!` : '';
  atualizaBotao();
}

function salvaNome(n){
  n = (n || '').trim();
  if (!n) return;
  localStorage.setItem('inv_nome', n);
  nomeUsuario = n;
  overlay.classList.add('hidden');
  modal.classList.add('hidden');
  nomeDisp.textContent = `Olá, ${n}!`;
  atualizaBotao();
}

/* ---------- LOCAL STORAGE (ITENS) ---------- */
function carregaLocais(){
  try {
    itens = JSON.parse(localStorage.getItem(ITENS_KEY) || '[]');
    itensEnviados = JSON.parse(localStorage.getItem(ITENS_ENVIADOS_KEY) || '[]');
    if (!Array.isArray(itens)) itens = [];
    if (!Array.isArray(itensEnviados)) itensEnviados = [];
  } catch (e) {
    console.error("Erro ao carregar dados locais:", e);
    itens = [];
    itensEnviados = [];
    localStorage.removeItem(ITENS_KEY);
    localStorage.removeItem(ITENS_ENVIADOS_KEY);
  }
  render();
  atualizaContadorItens();
}

function salvaLocais(){
  try {
    localStorage.setItem(ITENS_KEY, JSON.stringify(itens));
    localStorage.setItem(ITENS_ENVIADOS_KEY, JSON.stringify(itensEnviados));
  } catch (e) {
    console.error("Erro ao salvar dados locais:", e);
    alert("Atenção: Não foi possível salvar os dados localmente. Verifique o espaço de armazenamento do navegador.");
  }
  atualizaContadorItens();
}

function atualizaContadorItens() {
  const numItens = itens.length;
  enviarTodosBtn.textContent = `Enviar ${numItens} Item(s) Pendente(s)`;
  enviarTodosBtn.disabled = numItens === 0 || enviando || !nomeUsuario;
}

function render(){
  tbody.innerHTML = '';
  if (!itens.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item pendente de envio.</td></tr>';
    return;
  }
  [...itens].reverse().forEach((it, indexReverso) => {
    const originalIndex = itens.length - 1 - indexReverso;
    const dataHora = it.dt ? new Date(it.dt).toLocaleString('pt-BR') : 'Data inválida';
    const pesoLiqFormatado = typeof it.pLiq === 'number' ? it.pLiq.toFixed(3) : 'Inválido';
    const taraFormatada = typeof it.tara === 'number' ? it.tara.toFixed(3) : 'Inválido';

    tbody.insertAdjacentHTML('beforeend',
      `<tr>
        <td class="border px-2 py-1">${it.codigo || 'N/D'}</td>
        <td class="border px-2 py-1 text-right">${pesoLiqFormatado}</td>
        <td class="border px-2 py-1 text-right">${taraFormatada}</td>
        <td class="border px-2 py-1 text-center">${dataHora}</td>
        <td class="border px-2 py-1 text-center">
          <button data-i="${originalIndex}" class="text-red-600 hover:text-red-800 font-bold" title="Excluir este item localmente">X</button>
        </td>
      </tr>`);
  });
}

/* ---------- UTILIDADES DO FORMULÁRIO ---------- */
function atualizaBotao(){
  const desabilitar = enviando || !nomeUsuario;
  btnReg.disabled = desabilitar;
  enviarTodosBtn.disabled = desabilitar || itens.length === 0;
}

function resetForm(){
  codigoInp.value = '';
  taraInp.value = '';
  totalInp.value = '';
  nomeDiv.textContent = '';
  letraPoteSel = 'Nenhuma';
  spanLetra.textContent = '';
  desmarcaBotoes();
  codigoInp.focus();
}

function desmarcaBotoes(){
  letras.querySelectorAll('.tara-button.selected').forEach(b => b.classList.remove('selected'));
}

function mostraStatus(mensagem, tipo = 'info', tempo = 7000) {
    status.textContent = mensagem;
    // Define a classe baseada no tipo para estilização CSS
    status.className = ''; // Limpa classes anteriores
    switch(tipo) {
        case 'success':
            status.classList.add('status-success'); // Ex: fundo verde
            break;
        case 'error':
            status.classList.add('status-error');   // Ex: fundo vermelho
            break;
        case 'sending':
            status.classList.add('status-sending'); // Ex: fundo azul/amarelo
            break;
        case 'info':
        default:
            status.classList.add('status-info');    // Ex: fundo cinza/default
            break;
    }
    status.style.display = 'block';

    // Limpa a mensagem após um tempo, exceto se for 'sending'
    if (tipo !== 'sending' && tempo > 0) {
        setTimeout(() => {
            if (status.textContent === mensagem) {
                 status.textContent = '';
                 status.style.display = 'none';
                 status.className = '';
            }
        }, tempo);
    }
}


/* ---------- ENVIO INDIVIDUAL ---------- */
async function enviar() {
  if(enviando) return;
  if(!nomeUsuario) { pedeNome(); return; }

  const codigo = (codigoInp.value || '').trim();
  const pesoTotStr = (totalInp.value || '').replace(',', '.');
  const taraStr = (taraInp.value || '').replace(',', '.');

  if(!codigo) { alert('Código do produto é obrigatório.'); codigoInp.focus(); return; }
  if(!pesoTotStr) { alert('Peso total é obrigatório.'); totalInp.focus(); return; }

  const pesoTot = parseFloat(pesoTotStr);
  const tara = parseFloat(taraStr) || 0;

  if(isNaN(pesoTot)) { alert('Peso total inválido.'); totalInp.focus(); return; }
  if(isNaN(tara)) { alert('Peso da tara inválido.'); taraInp.focus(); return; }

  const pesoLiq = pesoTot - tara;
  if(pesoLiq <= 0) { alert('Peso líquido deve ser maior que zero (Peso Total - Tara).'); return; }

  const produtoInfo = MAPA[codigo] || {};
  const nomeProduto = produtoInfo.nome || '';

  const itemPayload = {
    usuario: nomeUsuario,
    codigo: codigo,
    nomeProduto: nomeProduto,
    pesoLiquido: pesoLiq,
    tara: tara,
    pesoTotal: pesoTot,
    letraPote: letraPoteSel
  };

   const itemLocal = {
      codigo: codigo,
      pLiq: pesoLiq,
      tara: tara,
      dt: Date.now(),
      usuario: nomeUsuario,
      nomeProduto: nomeProduto,
      pesoTotal: pesoTot,
      letraPote: letraPoteSel
    };

  enviando = true;
  atualizaBotao();
  mostraStatus('Enviando item...', 'sending', 0);

  try {
    itens.push(itemLocal);
    salvaLocais();
    render();

    console.log("Enviando payload:", JSON.stringify(itemPayload));
    const response = await fetch(GOOGLE_SCRIPT_URL, { // USA O NOVO URL AQUI
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(itemPayload)
    });

    // Analisa a resposta HTTP
    let responseData;
    try {
        responseData = await response.json(); // Tenta ler como JSON primeiro
    } catch (jsonError) {
        // Se não for JSON válido, tenta ler como texto (para erros HTML/servidor)
        const responseText = await response.text();
        console.error("Resposta não JSON recebida:", response.status, response.statusText, responseText);
        throw new Error(`Erro ${response.status}: ${response.statusText}. Resposta do servidor inesperada.`);
    }


    if (!response.ok) { // Verifica status HTTP (ex: 4xx, 5xx)
        let errorMsg = `Erro de rede ${response.status}: ${response.statusText}`;
        // Usa a mensagem do JSON se existir, senão usa a mensagem padrão
        errorMsg += ` - ${responseData.message || 'Sem detalhes adicionais do servidor'}`;
        throw new Error(errorMsg);
    }

    // Verifica a resposta lógica do script (result: success/error)
    if (responseData.result === 'success') {
      itensEnviados.push(itemLocal);
      itens = itens.filter(it => it.dt !== itemLocal.dt);
      salvaLocais();
      render();
      mostraStatus('Item enviado com sucesso!', 'success');
      resetForm();
    } else {
      // Script retornou result: 'error'
      throw new Error(responseData.message || 'Erro desconhecido retornado pelo servidor.');
    }

  } catch (e) {
    console.error('Falha no envio:', e);
    // Mostra a mensagem de erro capturada (seja de rede ou lógica)
    mostraStatus(`Erro: ${e.message}. Item salvo localmente.`, 'error', 15000);
  } finally {
    enviando = false;
    atualizaBotao();
  }
}


/* ---------- ENVIAR TODOS OS PENDENTES ---------- */
async function enviarTodos() {
  if(enviando || !nomeUsuario || itens.length === 0) return;

  if(!confirm(`Enviar ${itens.length} item(ns) pendente(s) para o servidor?`)) return;

  enviando = true;
  atualizaBotao();
  mostraStatus(`Enviando 0/${itens.length}...`, 'sending', 0);

  let sucesso = 0;
  let falhas = 0;
  const itensParaEnviar = [...itens];
  const itensEnviadosNestaRodada = [];
  const itensFalharamNestaRodada = []; // Não usado diretamente, mas poderia ser útil

  for(let i = 0; i < itensParaEnviar.length; i++) {
    const item = itensParaEnviar[i];
    mostraStatus(`Enviando ${i+1}/${itensParaEnviar.length}...`, 'sending', 0);

    const payload = {
      usuario: item.usuario || nomeUsuario,
      codigo: item.codigo,
      nomeProduto: item.nomeProduto || (MAPA[item.codigo] ? MAPA[item.codigo].nome : ''),
      pesoLiquido: item.pLiq,
      tara: item.tara,
      pesoTotal: item.pesoTotal || (item.pLiq + item.tara),
      letraPote: item.letraPote || 'Nenhuma'
    };

    try {
      console.log(`Enviando item ${i+1}:`, JSON.stringify(payload));
      const response = await fetch(GOOGLE_SCRIPT_URL, { // USA O NOVO URL AQUI
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      // Analisa a resposta
      let responseData;
       try {
            responseData = await response.json();
        } catch (jsonError) {
            const responseText = await response.text();
            console.error("Resposta não JSON (enviarTodos):", response.status, response.statusText, responseText);
            throw new Error(`Erro ${response.status}: ${response.statusText}. Resposta inesperada do servidor.`);
        }

      if (!response.ok) {
          let errorMsg = `Erro de rede ${response.status}: ${response.statusText}`;
          errorMsg += ` - ${responseData.message || 'Sem detalhes adicionais'}`;
          throw new Error(errorMsg);
      }

      if (responseData.result === 'success') {
        sucesso++;
        itensEnviadosNestaRodada.push(item);
      } else {
        throw new Error(responseData.message || 'Erro desconhecido no servidor');
      }

      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (e) {
      console.error(`Erro ao enviar item ${i+1} (Código: ${item.codigo}):`, e);
      falhas++;
      // Se falhou, o item continua no array 'itens' original
      // Poderia adicionar a uma lista de falhas se quisesse re-tentar especificamente
    }
  }

  // Processa os resultados após o loop
  if (itensEnviadosNestaRodada.length > 0) {
      itensEnviados.push(...itensEnviadosNestaRodada);
      const timestampsEnviados = new Set(itensEnviadosNestaRodada.map(it => it.dt));
      itens = itens.filter(it => !timestampsEnviados.has(it.dt)); // Remove os enviados com sucesso
      salvaLocais();
      render();
  }

  // Define a mensagem final de status
  if (falhas === 0 && sucesso > 0) {
    mostraStatus(`Enviados ${sucesso} itens com sucesso!`, 'success');
  } else if (sucesso > 0 && falhas > 0) {
    mostraStatus(`Enviados ${sucesso} itens, ${falhas} falharam e permanecem pendentes.`, 'error', 15000);
  } else if (sucesso === 0 && falhas > 0) {
    mostraStatus(`Falha ao enviar ${falhas} itens. Eles permanecem pendentes.`, 'error', 15000);
  } else if (sucesso === 0 && falhas === 0 && itensParaEnviar.length > 0) {
     mostraStatus('Nenhum item enviado, verifique os logs.', 'info'); // Caso estranho
  } else if (itensParaEnviar.length === 0) {
     mostraStatus('Não havia itens para enviar.', 'info');
  }


  enviando = false;
  atualizaBotao();
}

/* ---------- LISTENERS (Ouvintes de Eventos) ---------- */
function addListeners(){
  btnReg.onclick = enviar;
  enviarTodosBtn.onclick = enviarTodos;

  codigoInp.addEventListener('keydown', e => {if(e.key === 'Enter'){ e.preventDefault(); taraInp.focus(); }});
  taraInp.addEventListener('keydown', e => {if(e.key === 'Enter'){ e.preventDefault(); totalInp.focus(); }});
  totalInp.addEventListener('keydown', e => {if(e.key === 'Enter'){ e.preventDefault(); btnReg.click(); }});

  codigoInp.addEventListener('blur', () => {
    const codigo = codigoInp.value.trim();
    const d = MAPA[codigo];
    if (!d) {
        nomeDiv.textContent = '';
        // Não reseta tara/letra se código não for encontrado
        return;
    }
    nomeDiv.textContent = d.nome;
    if (!taraInp.value && d.tara !== undefined && d.tara !== null) {
        taraInp.value = d.tara.toFixed(3);
    }
    desmarcaBotoes();
    const b = letras.querySelector(`.tara-button[data-letra="${d.letra}"]`);
    if (b) {
        b.classList.add('selected');
        letraPoteSel = d.letra;
        spanLetra.textContent = `(${d.letra})`;
    } else {
        letraPoteSel = 'Manual';
        spanLetra.textContent = '(Manual)';
    }
  });

  letras.addEventListener('click', e => {
    const b = e.target.closest('.tara-button');
    if (!b) return;
    desmarcaBotoes();
    b.classList.add('selected');
    taraInp.value = parseFloat(b.dataset.taraKg).toFixed(3);
    letraPoteSel = b.dataset.letra;
    spanLetra.textContent = `(${letraPoteSel})`;
    totalInp.focus();
  });

  taraInp.addEventListener('input', () => {
    desmarcaBotoes();
    letraPoteSel = 'Manual';
    spanLetra.textContent = '(Manual)';
  });

  document.getElementById('limparSessaoLocalBtn').onclick = () => {
    if (itens.length === 0) {
        alert("Não há registros locais pendentes para limpar.");
        return;
    }
    if (confirm(`Tem certeza que deseja limpar os ${itens.length} registros locais pendentes?\nEsta ação não pode ser desfeita.`)) {
        itens = [];
        salvaLocais();
        render();
        alert("Registros locais limpos.");
    }
  };

  tbody.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.i !== undefined) {
      const indexParaExcluir = parseInt(e.target.dataset.i, 10);
      if (!isNaN(indexParaExcluir) && indexParaExcluir >= 0 && indexParaExcluir < itens.length) {
        const itemExcluir = itens[indexParaExcluir];
        if (confirm(`Deseja excluir localmente o item com código ${itemExcluir.codigo}?`)) {
            itens.splice(indexParaExcluir, 1);
            salvaLocais();
            render();
        }
      }
    }
  });

  document.getElementById('alterarNomeBtn').onclick = () => {
      inpNome.value = nomeUsuario;
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      inpNome.focus();
  };

  document.getElementById('salvarNomeUsuarioBtn').onclick = () => salvaNome(inpNome.value);
  inpNome.addEventListener('keydown', e => { if(e.key === 'Enter') salvaNome(inpNome.value); });
  overlay.onclick = () => {
      overlay.classList.add('hidden');
      modal.classList.add('hidden');
  };
}

// ----- FIM DO app.js -----
