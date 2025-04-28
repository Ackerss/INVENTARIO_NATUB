/* ========= CONFIG ========= */
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby9BdmtpHuyxQzyfMVNPIXisx_ADVo-Nod_HmTv-5ayEKzMjTDglmxTUqkI_ZeB8exN/exec'; // Mantido
const APP_VERSION = '28-abr-2025 - Feat: Peso Extra'; // Versão Atualizada
const ENVIO_DELAY_MS = 500;

/* ========= VARS ========= */
const ITENS_KEY = 'inv_granel_itens_v3'; // Nova chave para evitar conflito com estrutura antiga
const NOME_USUARIO_KEY = 'inventarioGranelUsuario';
let nomeUsuario = '', enviando = false, letraPoteSel = 'Nenhuma', itens = [], MAPA = {};

/* refs DOM */
const $ = id => document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'),
      pesoComPoteInp=$('pesoComPoteKg'), // Renomeado
      pesoExtraInp=$('pesoExtraKg'), // NOVO CAMPO
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
  selecionaBotaoNenhuma(); // Garante que 'Nenhuma' comece selecionado
});

/* ---------- Setup Eventos ---------- */
function setupEventListeners() {
  // Modal Nome (sem alterações)
  salvaNmBtn.addEventListener('click', salvaNome);
  inpNome.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Done') salvaNome(); });
  nomeDisp.addEventListener('click', abrirModalNome);
  btnAlterarNome.addEventListener('click', abrirModalNome);

  // Navegação Enter/Go
  const goKeys = ['Enter','Go','Next','Done','Send'];
  codigoInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); taraInp.focus(); taraInp.select();} });
  taraInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); pesoComPoteInp.focus(); pesoComPoteInp.select();} }); // Vai para peso com pote
  pesoComPoteInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); pesoExtraInp.focus(); pesoExtraInp.select();}}); // Vai para peso extra
  pesoExtraInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); btnReg.click(); }}); // Registra

  // Input Código Produto (Blur) -> Busca Tara Automática (sem alterações)
  codigoInp.addEventListener('blur', buscaTaraAutomatica);

  // Botões Tara Rápida
  letras.addEventListener('click', handleTaraRapidaClick);

  // Input Tara Manual -> Desmarca botão rápido
  taraInp.addEventListener('input', handleTaraManualInput);

  // Botão Registrar Item Localmente
  btnReg.addEventListener('click', registrarItemLocalmente);

  // Botão Enviar Todos (sem alterações)
  enviarTodosBtn.addEventListener('click', enviarTodos);

  // Botão Limpar Locais (sem alterações)
  btnLimpar.addEventListener('click', limparItensLocais);

  // Habilita/Desabilita botão Registrar ao digitar
  // Agora depende do código e do peso COM POTE
  [codigoInp, pesoComPoteInp].forEach(el => el.addEventListener('input', updateBotaoRegistrar));
  // Tara e Peso extra não são estritamente necessários para habilitar
}

/* ---------- Nome Usuário (sem alterações) ---------- */
function verificaNomeUsuario() { /* ...código mantido... */
  nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
  if (!nomeUsuario) {
    abrirModalNome();
  } else {
    mostrarNome();
    updateBotaoRegistrar();
  }
}
function abrirModalNome() { /* ...código mantido... */
  inpNome.value = nomeUsuario;
  overlay.classList.add('active');
  modal.classList.add('active');
  inpNome.focus();
  inpNome.select();
}
function salvaNome() { /* ...código mantido... */
  const n = inpNome.value.trim();
  if (!n) {
    alert('Por favor, digite seu nome.');
    return;
  }
  nomeUsuario = n;
  localStorage.setItem(NOME_USUARIO_KEY, n);
  mostrarNome();
  overlay.classList.remove('active');
  modal.classList.remove('active');
  updateBotaoRegistrar();
}
function mostrarNome() { /* ...código mantido... */
  nomeDisp.textContent = `Usuário: ${nomeUsuario}`;
}

/* ---------- Carregar Potes (sem alterações) ---------- */
async function carregaPotes() { /* ...código mantido... */
  try {
    const response = await fetch('potes.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    MAPA = data.reduce((map, pote) => {
      map[pote.codigo] = pote;
      return map;
    }, {});
    console.log('Potes carregados:', Object.keys(MAPA).length);
    geraBotoesTara();
  } catch (error) {
    console.error("Erro ao carregar potes.json:", error);
    letras.innerHTML = '<span class="text-red-500">Erro ao carregar potes.</span>';
  }
}

/* ---------- Gerar Botões de Tara Rápida (sem alterações) ---------- */
function geraBotoesTara() { /* ...código mantido... */
    letras.innerHTML = '';
    const potesUnicos = {};
    Object.values(MAPA).forEach(p => {
        if (p.letra && p.tara !== undefined && !potesUnicos[p.letra]) {
            potesUnicos[p.letra] = p.tara;
        }
    });

    Object.keys(potesUnicos).sort().forEach(letra => {
        const tara = potesUnicos[letra];
        const btn = document.createElement('button');
        btn.className = 'tara-button';
        btn.dataset.taraKg = tara;
        btn.dataset.letra = letra;
        btn.textContent = letra;
        letras.appendChild(btn);
    });
}

function handleTaraRapidaClick(event) {
    const btn = event.target.closest('.tara-button');
    if (!btn) return;

    // Desmarca todos, incluindo o "Nenhuma" fixo
    desmarcaBotoesTara();
    // Seleciona o clicado (seja ele qual for)
    btn.classList.add('selected');

    taraInp.value = parseFloat(btn.dataset.taraKg).toFixed(3);
    letraPoteSel = btn.dataset.letra;
    spanLetra.textContent = `(${letraPoteSel})`;
    pesoComPoteInp.focus(); // Move foco para peso com pote
    pesoComPoteInp.select();
}

function handleTaraManualInput() {
    desmarcaBotoesTara();
    letraPoteSel = 'Manual';
    spanLetra.textContent = '(Manual)';
    // Se limpar o campo manual, seleciona 'Nenhuma'
    if (!taraInp.value.trim()) {
        selecionaBotaoNenhuma();
    }
}

function desmarcaBotoesTara() {
    // Desmarca os botões gerados dinamicamente
    letras.querySelectorAll('.tara-button.selected').forEach(b => b.classList.remove('selected'));
    // Desmarca o botão "Nenhuma" fixo que está fora do container 'letras'
    const btnNenhuma = document.querySelector('.tara-button[data-letra="Nenhuma"]');
    if(btnNenhuma) btnNenhuma.classList.remove('selected');
}

// Função auxiliar para selecionar o botão 'Nenhuma'
function selecionaBotaoNenhuma() {
    desmarcaBotoesTara();
    const btnNenhuma = document.querySelector('.tara-button[data-letra="Nenhuma"]');
    if(btnNenhuma) {
        btnNenhuma.classList.add('selected');
        taraInp.value = parseFloat(btnNenhuma.dataset.taraKg).toFixed(3); // Deve ser 0.000
        letraPoteSel = 'Nenhuma';
        spanLetra.textContent = '(Nenhuma)';
    }
}

/* ---------- Busca Tara Automática (adaptado) ---------- */
function buscaTaraAutomatica() {
  const codigo = codigoInp.value.trim();
  const produto = MAPA[codigo];
  if (produto) {
    nomeDiv.textContent = produto.Nome || 'Produto sem nome';
    // Só preenche a tara se o campo estiver vazio ou se for 'Nenhuma' selecionado
    if (!taraInp.value.trim() || letraPoteSel === 'Nenhuma') {
        if (produto.tara !== undefined) {
            taraInp.value = parseFloat(produto.tara).toFixed(3);
            desmarcaBotoesTara();
            const btnLetra = letras.querySelector(`.tara-button[data-letra="${produto.letra}"]`);
            if (btnLetra) {
                btnLetra.classList.add('selected');
                letraPoteSel = produto.letra;
                spanLetra.textContent = `(${produto.letra})`;
            } else {
                letraPoteSel = 'Manual';
                spanLetra.textContent = '(Manual)';
            }
        } else {
            // Produto existe mas não tem tara definida -> seleciona 'Nenhuma'
           selecionaBotaoNenhuma();
        }
    }
  } else {
    nomeDiv.textContent = ''; // Limpa nome se código não encontrado
  }
   updateBotaoRegistrar();
}

/* ---------- Estado Botão Registrar (adaptado) ---------- */
function updateBotaoRegistrar() {
  // Precisa de usuário, código e peso COM POTE
  btnReg.disabled = !(nomeUsuario && codigoInp.value.trim() && pesoComPoteInp.value.trim());
}

/* ---------- Armazenamento Local ---------- */
function carregaLocais() { /* ...código mantido... */
  itens = JSON.parse(localStorage.getItem(ITENS_KEY) || '[]');
}
function salvaLocais() { /* ...código mantido... */
  localStorage.setItem(ITENS_KEY, JSON.stringify(itens));
  renderizaLista();
}
function limparItensLocais() { /* ...código mantido... */
    if (enviando) {
        alert("Aguarde o término do envio atual antes de limpar.");
        return;
    }
    if (itens.length === 0) {
        mostraStatus('Nenhum item local para limpar.', 'info', 3000);
        return;
    }
    if (confirm(`Tem certeza que deseja apagar ${itens.length} registro(s) locais pendentes? Esta ação não pode ser desfeita.`)) {
        itens = [];
        salvaLocais();
        mostraStatus('Registros locais limpos.', 'success', 3000);
    }
}

/* ---------- Registrar Item Localmente (adaptado) ---------- */
function registrarItemLocalmente() {
  updateBotaoRegistrar();
  if (btnReg.disabled) return;

  const codigo = codigoInp.value.trim();
  const tara = parseFloat(taraInp.value.replace(',', '.')) || 0;
  const pesoComPote = parseFloat(pesoComPoteInp.value.replace(',', '.'));
  const pesoExtra = parseFloat(pesoExtraInp.value.replace(',', '.')) || 0; // NOVO

  // Validação Peso com Pote
  if (isNaN(pesoComPote)) {
    mostraStatus('Erro: Peso COM POTE inválido.', 'error');
    pesoComPoteInp.focus();
    return;
  }

  const pesoLiquidoPote = pesoComPote - tara;
  // Não impede registro se peso líquido do pote for negativo, pois pode haver peso extra
  // if (pesoLiquidoPote < 0) {
  //   mostraStatus('Aviso: Peso líquido no pote está negativo.', 'info', 3000);
  // }

  const pesoLiquidoTotal = +(pesoLiquidoPote + pesoExtra).toFixed(3); // Soma extra e arredonda

  // Validação final do peso líquido total
   if (pesoLiquidoTotal < 0) {
      mostraStatus('Erro: Peso Líquido TOTAL negativo. Verifique os pesos.', 'error');
      return;
   }

  const produtoInfo = MAPA[codigo] || {};

  const novoItem = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    usuario: nomeUsuario,
    codigo: codigo,
    nomeProduto: produtoInfo.Nome || 'NÃO ENCONTRADO',
    pesoLiquido: pesoLiquidoTotal, // <-- Agora é o total
    tara: tara,
    pesoComPote: pesoComPote, // <-- Mantém o peso bruto do pote pesado
    pesoExtra: pesoExtra,     // <-- Guarda o peso extra
    letraPote: letraPoteSel || produtoInfo.letra || 'N/D'
  };

  itens.push(novoItem);
  salvaLocais();

  // Limpa campos para próximo item
  codigoInp.value = '';
  taraInp.value = '';
  pesoComPoteInp.value = '';
  pesoExtraInp.value = ''; // Limpa extra também
  nomeDiv.textContent = '';

  selecionaBotaoNenhuma(); // Seleciona 'Nenhuma' por padrão para a próxima

  codigoInp.focus();
  mostraStatus('Item registrado localmente!', 'success', 2000);
  updateBotaoRegistrar();
}

/* ---------- Renderizar Lista de Pendentes (adaptado) ---------- */
function renderizaLista() {
  tbody.innerHTML = '';
  contadorPendentes.textContent = itens.length;

  if (itens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item local pendente.</td></tr>';
    enviarTodosBtn.disabled = true;
    return;
  }

  enviarTodosBtn.disabled = enviando;

  itens.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${item.codigo}</td>
      <td class="border px-2 py-1">${item.pesoLiquido.toFixed(3)}</td> <td class="border px-2 py-1">${item.tara.toFixed(3)} (${item.letraPote})</td>
      <td class="border px-2 py-1 text-xs">${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700" data-id="${item.id}" title="Excluir este item">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tr.querySelector('button').addEventListener('click', () => excluirItem(item.id));
    tbody.appendChild(tr);
  });
}

function excluirItem(id) { /* ...código mantido... */
    if (enviando) {
        alert("Aguarde o término do envio atual para excluir itens.");
        return;
    }
    const itemIndex = itens.findIndex(i => i.id === id);
    if (itemIndex > -1) {
        if (confirm(`Tem certeza que deseja excluir o item ${itens[itemIndex].codigo}?`)) {
            itens.splice(itemIndex, 1);
            salvaLocais();
            mostraStatus('Item excluído localmente.', 'info', 2000);
        }
    }
}


/* ---------- Envio para Google Apps Script (adaptado) ---------- */
async function enviarTodos() { /* ...código mantido, a lógica interna de loop é a mesma... */
  if (enviando || itens.length === 0) return;

  enviando = true;
  enviarTodosBtn.disabled = true;
  btnLimpar.disabled = true;
  btnReg.disabled = true;
  mostraStatus(`Enviando ${itens.length} item(ns)...`, 'sending');

  const itensParaEnviar = [...itens];
  let enviadosComSucesso = 0;
  let falhas = 0;

  for (let i = 0; i < itensParaEnviar.length; i++) {
    const item = itensParaEnviar[i];
    mostraStatus(`Enviando ${i + 1}/${itensParaEnviar.length}: Código ${item.codigo}...`, 'sending');
    try {
      await enviarItem(item); // A função enviarItem foi adaptada
      const indexOriginal = itens.findIndex(original => original.id === item.id);
      if (indexOriginal > -1) {
        itens.splice(indexOriginal, 1);
      }
      enviadosComSucesso++;
      salvaLocais();
    } catch (error) {
      console.error('Falha ao enviar item:', item.id, error);
      falhas++;
    }
    if (i < itensParaEnviar.length - 1) {
      await new Promise(resolve => setTimeout(resolve, ENVIO_DELAY_MS));
    }
  }

  enviando = false;
  btnLimpar.disabled = false;
  updateBotaoRegistrar();
  renderizaLista(); // Atualiza estado final

  if (falhas === 0 && enviadosComSucesso > 0) {
    mostraStatus(`Todos os ${enviadosComSucesso} itens foram enviados com sucesso!`, 'success', 5000);
  } else if (falhas > 0 && enviadosComSucesso > 0) {
    mostraStatus(`${enviadosComSucesso} itens enviados, ${falhas} falharam. Tente enviar os pendentes novamente.`, 'error', 8000);
  } else if (falhas > 0 && enviadosComSucesso === 0) {
    mostraStatus(`Falha ao enviar todos os ${falhas} itens. Verifique a conexão e tente novamente.`, 'error', 8000);
  } else {
     mostraStatus('Nenhum item para enviar.', 'info', 3000);
  }
}

// Função auxiliar para enviar um único item (adaptada)
async function enviarItem(item) {
  const formData = new FormData();
  formData.append('timestamp', item.timestamp);
  formData.append('usuario', item.usuario);
  formData.append('codigo', item.codigo);
  formData.append('nomeProduto', item.nomeProduto);
  formData.append('pesoLiquido', item.pesoLiquido); // Este é o peso líquido TOTAL
  formData.append('tara', item.tara);
  formData.append('pesoComPote', item.pesoComPote); // Peso bruto pesado na balança
  formData.append('pesoExtra', item.pesoExtra);     // Peso dos pacotes/estoque adicional
  formData.append('letraPote', item.letraPote);
  formData.append('idLocal', item.id);

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData,
    });

     let responseData = {};
     try {
       responseData = await response.json();
     } catch (jsonError) {
        const textResponse = await response.text();
        console.error("Resposta não era JSON:", textResponse);
        throw new Error(`Erro ${response.status}: Resposta inválida do servidor. ${textResponse.substring(0,100)}`);
     }

    if (!response.ok || responseData.result !== 'success') {
      console.error('Resposta do Script não foi sucesso:', responseData);
      throw new Error(responseData.message || `Erro ${response.status}`);
    }

    console.log('Item enviado com sucesso:', item.id, responseData);

  } catch (networkOrScriptError) {
    console.error("Erro de rede ou script ao enviar item:", networkOrScriptError);
    throw networkOrScriptError;
  }
}


/* ---------- UI Feedback (Status) (sem alterações) ---------- */
let statusTimeout;
function mostraStatus(mensagem, tipo = 'info', duracaoMs = 4000) { /* ...código mantido... */
  clearTimeout(statusTimeout);
  status.textContent = mensagem;
  status.className = `status-base status-${tipo}`;
  status.style.display = 'block';

  if (tipo !== 'sending' && duracaoMs > 0) {
    statusTimeout = setTimeout(() => {
      status.style.display = 'none';
      status.textContent = '';
      status.className = 'status-base';
    }, duracaoMs);
  }
}
