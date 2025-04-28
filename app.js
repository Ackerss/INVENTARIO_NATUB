/* ========= CONFIG ========= */
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwy_aKGV9xAd9sBJRGG66LohrR3s0l_DbDCnOveCEHaE_RGjNqgTHbkiBX8ngks3-nO/exec'; // Mantido o último URL funcional
const APP_VERSION = '28-abr-2025 - Fix: Fluxo Nenhuma'; // Versão Atualizada
const ENVIO_DELAY_MS = 500;

/* ========= VARS ========= */
const ITENS_KEY = 'inv_granel_itens_v3';
const NOME_USUARIO_KEY = 'inventarioGranelUsuario';
let nomeUsuario = '', enviando = false, letraPoteSel = 'Nenhuma', itens = [], MAPA = {};

/* refs DOM */
const $ = id => document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'),
      pesoComPoteInp=$('pesoComPoteKg'),
      pesoExtraInp=$('pesoExtraKg'),
      btnReg=$('registrarItemBtn'), tbody=$('listaItensBody'),
      letras=$('botoesTaraContainer'), status=$('statusEnvio'),
      nomeDisp=$('nomeUsuarioDisplay'), modal=$('modalNomeUsuario'),
      overlay=$('overlayNomeUsuario'), inpNome=$('inputNomeUsuario'),
      spanLetra=$('letraPoteSelecionado'), enviarTodosBtn=$('enviarTodosBtn'),
      contadorPendentes=$('contadorPendentes'), btnLimpar=$('limparSessaoLocalBtn'),
      btnAlterarNome=$('alterarNomeBtn'), salvaNmBtn=$('salvarNomeUsuarioBtn');

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  console.log('App carregado:', APP_VERSION);
  setupEventListeners();
  carregaLocais();
  await carregaPotes();
  renderizaLista();
  verificaNomeUsuario();
  updateBotaoRegistrar();
  selecionaBotaoNenhuma();
});

/* ---------- Setup Eventos ---------- */
function setupEventListeners() {
  // Modal Nome
  salvaNmBtn.addEventListener('click', salvaNome);
  inpNome.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Done') salvaNome(); });
  nomeDisp.addEventListener('click', abrirModalNome);
  btnAlterarNome.addEventListener('click', abrirModalNome);

  // Navegação Enter/Go
  const goKeys = ['Enter','Go','Next','Done','Send'];
  codigoInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); taraInp.focus(); taraInp.select();} });
  taraInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); pesoComPoteInp.focus(); pesoComPoteInp.select();} });
  pesoComPoteInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); pesoExtraInp.focus(); pesoExtraInp.select();}});
  pesoExtraInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); btnReg.click(); }});

  // Input Código Produto (Blur) -> Busca Tara Automática
  codigoInp.addEventListener('blur', buscaTaraAutomatica);

  // Botões Tara Rápida (Dinâmicos)
  letras.addEventListener('click', handleTaraRapidaClick);
  // Evento para o botão "Nenhuma" fixo
  const btnNenhumaFixo = document.querySelector('.tara-button[data-letra="Nenhuma"]');
  if (btnNenhumaFixo) {
      btnNenhumaFixo.addEventListener('click', handleTaraRapidaClick);
  }

  // Input Tara Manual -> Desmarca botão rápido
  taraInp.addEventListener('input', handleTaraManualInput);

  // Botão Registrar Item Localmente
  btnReg.addEventListener('click', registrarItemLocalmente);

  // Botão Enviar Todos
  enviarTodosBtn.addEventListener('click', enviarTodos);

  // Botão Limpar Locais
  btnLimpar.addEventListener('click', limparItensLocais);

  // Habilita/Desabilita botão Registrar ao digitar
  [codigoInp, pesoComPoteInp].forEach(el => el.addEventListener('input', updateBotaoRegistrar));
}

/* ---------- Nome Usuário (sem alterações) ---------- */
function verificaNomeUsuario() { /* ...código mantido... */
  nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
  if (!nomeUsuario) { abrirModalNome(); } else { mostrarNome(); updateBotaoRegistrar(); }
}
function abrirModalNome() { /* ...código mantido... */
  inpNome.value = nomeUsuario; overlay.classList.add('active'); modal.classList.add('active'); inpNome.focus(); inpNome.select();
}
function salvaNome() { /* ...código mantido... */
  const n = inpNome.value.trim(); if (!n) { alert('Por favor, digite seu nome.'); return; } nomeUsuario = n; localStorage.setItem(NOME_USUARIO_KEY, n); mostrarNome(); overlay.classList.remove('active'); modal.classList.remove('active'); updateBotaoRegistrar();
}
function mostrarNome() { /* ...código mantido... */
  nomeDisp.textContent = `Usuário: ${nomeUsuario}`;
}

/* ---------- Carregar Potes (sem alterações) ---------- */
async function carregaPotes() { /* ...código mantido... */
  try { const response = await fetch('potes.json'); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const data = await response.json(); MAPA = data.reduce((map, pote) => { map[pote.codigo] = pote; return map; }, {}); console.log('Potes carregados:', Object.keys(MAPA).length); geraBotoesTara(); } catch (error) { console.error("Erro ao carregar potes.json:", error); letras.innerHTML = '<span class="text-red-500">Erro ao carregar potes.</span>'; }
}

/* ---------- Gerar Botões de Tara Rápida (sem alterações) ---------- */
function geraBotoesTara() { /* ...código mantido... */
    letras.innerHTML = ''; const potesUnicos = {}; Object.values(MAPA).forEach(p => { if (p.letra && p.tara !== undefined && p.letra !== 'Nenhuma' && !potesUnicos[p.letra]) { potesUnicos[p.letra] = p.tara; } }); Object.keys(potesUnicos).sort().forEach(letra => { const tara = potesUnicos[letra]; const btn = document.createElement('button'); btn.className = 'tara-button'; btn.dataset.taraKg = tara; btn.dataset.letra = letra; btn.textContent = letra; letras.appendChild(btn); });
}

/* ---------- Funções de Tara (MODIFICADO handleTaraRapidaClick) ---------- */
function handleTaraRapidaClick(event) {
    const btn = event.target.closest('.tara-button');
    if (!btn) return;

    // Ações comuns para qualquer botão de tara
    desmarcaBotoesTara();
    btn.classList.add('selected');
    taraInp.value = parseFloat(btn.dataset.taraKg).toFixed(3);
    letraPoteSel = btn.dataset.letra;
    spanLetra.textContent = `(${letraPoteSel})`;

    // --- LÓGICA ESPECÍFICA PARA "NENHUMA" ---
    if (letraPoteSel === 'Nenhuma') {
        pesoComPoteInp.value = '0'; // Define Peso COM POTE como 0
        pesoExtraInp.focus();       // Move foco para Peso EXTRA
        pesoExtraInp.select();
        console.log("Botão Nenhuma clicado: Peso com pote zerado, foco no Peso Extra.");
        // Atualiza estado do botão registrar, pois agora pesoComPote tem valor '0'
        updateBotaoRegistrar();
    } else {
        // Se for outro botão (A, B, C...), move foco para Peso COM POTE
        pesoComPoteInp.focus();
        pesoComPoteInp.select();
        console.log(`Botão ${letraPoteSel} clicado: Foco no Peso com Pote.`);
    }
    // --- FIM DA LÓGICA ---
}

function handleTaraManualInput() { /* ...código mantido... */
    desmarcaBotoesTara(); letraPoteSel = 'Manual'; spanLetra.textContent = '(Manual)'; if (!taraInp.value.trim()) { selecionaBotaoNenhuma(); }
}
function desmarcaBotoesTara() { /* ...código mantido... */
    letras.querySelectorAll('.tara-button.selected').forEach(b => b.classList.remove('selected')); const btnNenhumaFixo = document.querySelector('.tara-button[data-letra="Nenhuma"]'); if(btnNenhumaFixo) btnNenhumaFixo.classList.remove('selected');
}
function selecionaBotaoNenhuma() { /* ...código mantido... */
    desmarcaBotoesTara(); const btnNenhumaFixo = document.querySelector('.tara-button[data-letra="Nenhuma"]'); if(btnNenhumaFixo) { btnNenhumaFixo.classList.add('selected'); taraInp.value = parseFloat(btnNenhumaFixo.dataset.taraKg).toFixed(3); letraPoteSel = 'Nenhuma'; spanLetra.textContent = '(Nenhuma)'; }
}

/* ---------- Busca Tara Automática (sem alterações) ---------- */
function buscaTaraAutomatica() { /* ...código mantido... */
  const codigo = codigoInp.value.trim(); const produto = MAPA[codigo]; if (produto) { nomeDiv.textContent = produto.Nome || 'Produto sem nome'; if (!taraInp.value.trim() || letraPoteSel === 'Nenhuma') { if (produto.tara !== undefined && produto.tara !== null) { taraInp.value = parseFloat(produto.tara).toFixed(3); desmarcaBotoesTara(); const btnLetra = letras.querySelector(`.tara-button[data-letra="${produto.letra}"]`); if (btnLetra) { btnLetra.classList.add('selected'); letraPoteSel = produto.letra; spanLetra.textContent = `(${produto.letra})`; } else { if(produto.letra === 'Nenhuma') { selecionaBotaoNenhuma(); } else { letraPoteSel = 'Manual'; spanLetra.textContent = '(Manual)'; } } } else { selecionaBotaoNenhuma(); } } } else { nomeDiv.textContent = ''; } updateBotaoRegistrar();
}

/* ---------- Estado Botão Registrar (sem alterações) ---------- */
function updateBotaoRegistrar() { /* ...código mantido... */
  // Habilitado se tiver nome, código E peso com pote (mesmo que seja '0' agora)
  btnReg.disabled = !(nomeUsuario && codigoInp.value.trim() && pesoComPoteInp.value.trim());
}

/* ---------- Armazenamento Local (sem alterações) ---------- */
function carregaLocais() { /* ...código mantido... */ itens = JSON.parse(localStorage.getItem(ITENS_KEY) || '[]'); }
function salvaLocais() { /* ...código mantido... */ localStorage.setItem(ITENS_KEY, JSON.stringify(itens)); renderizaLista(); }
function limparItensLocais() { /* ...código mantido... */ if (enviando) { alert("Aguarde o término do envio atual antes de limpar."); return; } if (itens.length === 0) { mostraStatus('Nenhum item local para limpar.', 'info', 3000); return; } if (confirm(`Tem certeza que deseja apagar ${itens.length} registro(s) locais pendentes? Esta ação não pode ser desfeita.`)) { itens = []; salvaLocais(); mostraStatus('Registros locais limpos.', 'success', 3000); } }

/* ---------- Registrar Item Localmente (sem alterações lógicas aqui, a validação está ok) ---------- */
function registrarItemLocalmente() { /* ...código mantido da versão anterior, pois já trata pote vazio... */
  updateBotaoRegistrar();
  if (btnReg.disabled) {
    alert('Preencha o código e o peso com pote para registrar.');
    return;
  };

  const codigo = codigoInp.value.trim();
  let taraInput = parseFloat(taraInp.value.replace(',', '.')) || 0;
  const pesoComPote = parseFloat(pesoComPoteInp.value.replace(',', '.')) || 0; // Default 0
  const pesoExtra = parseFloat(pesoExtraInp.value.replace(',', '.')) || 0;   // Default 0

  let taraCalculo = taraInput;
  let letraPoteCalculo = letraPoteSel;

  // Lógica de segurança: Se peso com pote for 0, força tara 0 e letra Nenhuma
  if (pesoComPote === 0) {
      taraCalculo = 0;
      letraPoteCalculo = 'Nenhuma';
      // Opcional: garantir visualmente que Nenhuma esteja selecionado
      // selecionaBotaoNenhuma(); // Cuidado para não re-chamar eventos infinitos se já estiver aqui via clique
  }

  if (isNaN(pesoComPote)) { mostraStatus('Erro: Peso COM POTE inválido.', 'error'); pesoComPoteInp.focus(); return; }
  if (isNaN(taraCalculo)) { mostraStatus('Erro: Peso da TARA inválido.', 'error'); taraInp.focus(); return; }
  if (isNaN(pesoExtra)) { mostraStatus('Aviso: Peso Extra inválido, será considerado 0.', 'info', 3000); }


  const pesoLiquidoPote = pesoComPote - taraCalculo;
  const pesoLiquidoTotal = +(pesoLiquidoPote + pesoExtra).toFixed(3);

   if (pesoLiquidoTotal <= 0 && pesoExtra <= 0) { // Ajuste: permite registro se SÓ o extra for positivo
      mostraStatus('Erro: Peso Líquido TOTAL zerado ou negativo.', 'error');
      return;
   }

  const produtoInfo = MAPA[codigo] || {};

  const novoItem = {
    id: Date.now(), timestamp: new Date().toISOString(), usuario: nomeUsuario,
    codigo: codigo, nomeProduto: produtoInfo.Nome || 'NÃO ENCONTRADO',
    pesoLiquido: pesoLiquidoTotal, tara: taraCalculo, pesoComPote: pesoComPote,
    pesoExtra: pesoExtra, letraPote: letraPoteCalculo
  };

  itens.push(novoItem);
  salvaLocais();

  // Limpa campos
  codigoInp.value = ''; taraInp.value = ''; pesoComPoteInp.value = ''; pesoExtraInp.value = ''; nomeDiv.textContent = '';
  selecionaBotaoNenhuma(); // Seleciona 'Nenhuma' por padrão

  codigoInp.focus(); mostraStatus('Item registrado localmente!', 'success', 2000); updateBotaoRegistrar();
}

/* ---------- Renderizar Lista de Pendentes (sem alterações) ---------- */
function renderizaLista() { /* ...código mantido... */
  tbody.innerHTML = ''; contadorPendentes.textContent = itens.length; if (itens.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item local pendente.</td></tr>'; enviarTodosBtn.disabled = true; return; } enviarTodosBtn.disabled = enviando; [...itens].reverse().forEach((item) => { const tr = document.createElement('tr'); tr.innerHTML = ` <td class="border px-2 py-1">${item.codigo}</td> <td class="border px-2 py-1 text-right">${item.pesoLiquido.toFixed(3)}</td> <td class="border px-2 py-1 text-right">${item.tara.toFixed(3)} (${item.letraPote})</td> <td class="border px-2 py-1 text-xs text-center">${new Date(item.timestamp).toLocaleString('pt-BR')}</td> <td class="border px-2 py-1 text-center"> <button class="text-red-500 hover:text-red-700 p-1" data-id="${item.id}" title="Excluir este item"> <i class="fas fa-trash-alt"></i> </button> </td> `; tr.querySelector('button').addEventListener('click', () => excluirItem(item.id)); tbody.appendChild(tr); });
}

/* ---------- Excluir Item (sem alterações) ---------- */
function excluirItem(id) { /* ...código mantido... */
    if (enviando) { alert("Aguarde o término do envio atual para excluir itens."); return; } const itemIndex = itens.findIndex(i => i.id === id); if (itemIndex > -1) { if (confirm(`Tem certeza que deseja excluir o item ${itens[itemIndex].codigo}?`)) { itens.splice(itemIndex, 1); salvaLocais(); mostraStatus('Item excluído localmente.', 'info', 2000); } }
}

/* ---------- Envio para Google Apps Script (sem alterações) ---------- */
async function enviarTodos() { /* ...código mantido... */
  if (enviando || itens.length === 0) return; enviando = true; enviarTodosBtn.disabled = true; btnLimpar.disabled = true; btnReg.disabled = true; mostraStatus(`Enviando ${itens.length} item(ns)...`, 'sending'); const itensParaEnviar = [...itens]; let enviadosComSucesso = 0; let falhas = 0; const idsEnviadosComSucesso = []; for (let i = 0; i < itensParaEnviar.length; i++) { const item = itensParaEnviar[i]; mostraStatus(`Enviando ${i + 1}/${itensParaEnviar.length}: Código ${item.codigo}...`, 'sending'); try { const resultadoEnvio = await enviarItem(item); if (resultadoEnvio && resultadoEnvio.result === 'success' && resultadoEnvio.idLocal == item.id) { enviadosComSucesso++; idsEnviadosComSucesso.push(item.id); } else { throw new Error(resultadoEnvio.message || 'Resposta inesperada do servidor.'); } } catch (error) { console.error('Falha ao enviar item:', item.id, error); falhas++; mostraStatus(`Falha item ${item.codigo}: ${error.message}`, 'error', 5000); await new Promise(resolve => setTimeout(resolve, ENVIO_DELAY_MS * 2)); } if (i < itensParaEnviar.length - 1) { await new Promise(resolve => setTimeout(resolve, ENVIO_DELAY_MS)); } } if(idsEnviadosComSucesso.length > 0) { itens = itens.filter(item => !idsEnviadosComSucesso.includes(item.id)); salvaLocais(); } enviando = false; btnLimpar.disabled = false; updateBotaoRegistrar(); renderizaLista(); if (falhas === 0 && enviadosComSucesso > 0) { mostraStatus(`Todos os ${enviadosComSucesso} itens foram enviados com sucesso!`, 'success', 5000); } else if (falhas > 0 && enviadosComSucesso > 0) { mostraStatus(`${enviadosComSucesso} itens enviados, ${falhas} falharam. Tente enviar os pendentes novamente.`, 'error', 8000); } else if (falhas > 0 && enviadosComSucesso === 0) { mostraStatus(`Falha ao enviar todos os ${falhas} itens. Verifique a conexão/logs e tente novamente.`, 'error', 8000); } else if (falhas === 0 && enviadosComSucesso === 0 && itensParaEnviar.length > 0) { mostraStatus('Nenhum item enviado (sem falhas reportadas?). Verifique a lista.', 'info', 5000); } else { mostraStatus('Não havia itens para enviar.', 'info', 3000); }
}

// Função auxiliar para enviar um único item (sem alterações)
async function enviarItem(item) { /* ...código mantido... */
  const formData = new FormData(); formData.append('timestamp', item.timestamp); formData.append('usuario', item.usuario); formData.append('codigo', item.codigo); formData.append('nomeProduto', item.nomeProduto); formData.append('pesoLiquido', item.pesoLiquido); formData.append('tara', item.tara); formData.append('pesoComPote', item.pesoComPote); formData.append('pesoExtra', item.pesoExtra); formData.append('letraPote', item.letraPote); formData.append('idLocal', item.id); console.log('Enviando item com ID local:', item.id); try { const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData, }); let responseData = {}; const contentType = response.headers.get("content-type"); if (contentType && contentType.indexOf("application/json") !== -1) { responseData = await response.json(); } else { const textResponse = await response.text(); console.error("Resposta não JSON recebida do script:", response.status, response.statusText, textResponse); throw new Error(`Erro ${response.status}: ${response.statusText}. Resposta inesperada do servidor.`); } if (!response.ok) { console.error('Erro HTTP ao enviar:', response.status, responseData); throw new Error(responseData.message || `Erro de rede ${response.status}`); } if(responseData.result !== 'success') { console.error('Script retornou erro lógico:', responseData); throw new Error(responseData.message || `Erro desconhecido retornado pelo script.`); } console.log('Resposta de sucesso do script para idLocal', item.id, ':', responseData); return responseData; } catch (error) { console.error("Falha no fetch ou processamento da resposta para idLocal:", item.id, error); return { result: 'error', message: error.message, idLocal: item.id }; }
}


/* ---------- UI Feedback (Status) (sem alterações) ---------- */
let statusTimeout;
function mostraStatus(mensagem, tipo = 'info', duracaoMs = 4000) { /* ...código mantido... */
  clearTimeout(statusTimeout); status.textContent = mensagem; status.className = `status-base status-${tipo}`; status.style.display = 'block'; if (tipo !== 'sending' && duracaoMs > 0) { statusTimeout = setTimeout(() => { status.style.display = 'none'; status.textContent = ''; status.className = 'status-base'; }, duracaoMs); }
}
