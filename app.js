/* ========= CONFIG ========= */
// !!! URL ATUALIZADO COM A ÚLTIMA IMPLANTAÇÃO !!!
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwy_aKGV9xAd9sBJRGG66LohrR3s0l_DbDCnOveCEHaE_RGjNqgTHbkiBX8ngks3-nO/exec'; // <-- SEU NOVO URL
const APP_VERSION = '28-abr-2025 - URL Final'; // Versão Atualizada
const ENVIO_DELAY_MS = 500; // Intervalo de 0.5 segundos entre envios

/* ========= VARS ========= */
const ITENS_KEY = 'inv_granel_itens_v3'; // Mantendo a chave da versão com peso extra
const NOME_USUARIO_KEY = 'inventarioGranelUsuario';
let nomeUsuario = '', enviando = false, letraPoteSel = 'Nenhuma', itens = [], MAPA = {};

/* refs DOM */
const $ = id => document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'),
      pesoComPoteInp=$('pesoComPoteKg'), // Nome antigo: totalInp
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

  // Botões Tara Rápida
  letras.addEventListener('click', handleTaraRapidaClick);
  // Evento para o botão "Nenhuma" que está fora do container dinâmico
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

/* ---------- Nome Usuário ---------- */
function verificaNomeUsuario() {
  nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
  if (!nomeUsuario) {
    abrirModalNome();
  } else {
    mostrarNome();
    updateBotaoRegistrar();
  }
}
function abrirModalNome() {
  inpNome.value = nomeUsuario;
  overlay.classList.add('active');
  modal.classList.add('active');
  inpNome.focus();
  inpNome.select();
}
function salvaNome() {
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
function mostrarNome() {
  nomeDisp.textContent = `Usuário: ${nomeUsuario}`;
}

/* ---------- Carregar Potes (Produtos) ---------- */
async function carregaPotes() {
  try {
    const response = await fetch('potes.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    MAPA = data.reduce((map, pote) => {
      map[pote.codigo] = pote;
      return map;
    }, {});
    console.log('Potes carregados:', Object.keys(MAPA).length);
    geraBotoesTara(); // Gera botões após carregar
  } catch (error) {
    console.error("Erro ao carregar potes.json:", error);
    letras.innerHTML = '<span class="text-red-500">Erro ao carregar potes.</span>';
  }
}

/* ---------- Gerar Botões de Tara Rápida ---------- */
function geraBotoesTara() {
    letras.innerHTML = ''; // Limpa container dos botões dinâmicos
    const potesUnicos = {};
    Object.values(MAPA).forEach(p => {
        // Pega apenas uma tara por letra, mesmo que haja produtos diferentes com mesma letra/tara
        if (p.letra && p.tara !== undefined && p.letra !== 'Nenhuma' && !potesUnicos[p.letra]) {
            potesUnicos[p.letra] = p.tara;
        }
    });

    // Ordena as letras (A, B, C...)
    Object.keys(potesUnicos).sort().forEach(letra => {
        const tara = potesUnicos[letra];
        const btn = document.createElement('button');
        btn.className = 'tara-button';
        btn.dataset.taraKg = tara;
        btn.dataset.letra = letra;
        btn.textContent = letra;
        letras.appendChild(btn); // Adiciona ao container dinâmico
    });
}

// Evento unificado para botões de tara (dinâmicos e o fixo "Nenhuma")
function handleTaraRapidaClick(event) {
    const btn = event.target.closest('.tara-button');
    if (!btn) return;

    desmarcaBotoesTara(); // Desmarca todos
    btn.classList.add('selected'); // Marca o clicado

    // Define valor e label
    taraInp.value = parseFloat(btn.dataset.taraKg).toFixed(3);
    letraPoteSel = btn.dataset.letra;
    spanLetra.textContent = `(${letraPoteSel})`;

    // Move foco para o próximo campo relevante
    pesoComPoteInp.focus();
    pesoComPoteInp.select();
}


function handleTaraManualInput() {
    desmarcaBotoesTara(); // Desmarca todos os botões
    letraPoteSel = 'Manual'; // Indica que foi digitado manualmente
    spanLetra.textContent = '(Manual)';
    // Se limpar o campo manual, seleciona 'Nenhuma' como padrão
    if (!taraInp.value.trim()) {
        selecionaBotaoNenhuma();
    }
}

function desmarcaBotoesTara() {
    // Desmarca os botões gerados dinamicamente dentro do container 'letras'
    letras.querySelectorAll('.tara-button.selected').forEach(b => b.classList.remove('selected'));
    // Desmarca o botão "Nenhuma" fixo
    const btnNenhumaFixo = document.querySelector('.tara-button[data-letra="Nenhuma"]');
    if(btnNenhumaFixo) btnNenhumaFixo.classList.remove('selected');
}

// Função auxiliar para selecionar o botão 'Nenhuma'
function selecionaBotaoNenhuma() {
    desmarcaBotoesTara();
    const btnNenhumaFixo = document.querySelector('.tara-button[data-letra="Nenhuma"]');
    if(btnNenhumaFixo) {
        btnNenhumaFixo.classList.add('selected');
        // Define a tara como 0.000 (ou vazio, dependendo da preferência)
        taraInp.value = parseFloat(btnNenhumaFixo.dataset.taraKg).toFixed(3);
        letraPoteSel = 'Nenhuma';
        spanLetra.textContent = '(Nenhuma)';
    }
}

/* ---------- Busca Tara Automática ---------- */
function buscaTaraAutomatica() {
  const codigo = codigoInp.value.trim();
  const produto = MAPA[codigo];
  if (produto) {
    nomeDiv.textContent = produto.Nome || 'Produto sem nome';

    // Preenche tara E seleciona botão apenas se o campo de tara estiver vazio ou 'Nenhuma' selecionado
    if (!taraInp.value.trim() || letraPoteSel === 'Nenhuma') {
        if (produto.tara !== undefined && produto.tara !== null) {
            // Produto tem tara definida
            taraInp.value = parseFloat(produto.tara).toFixed(3);
            desmarcaBotoesTara(); // Desmarca qualquer outro
            const btnLetra = letras.querySelector(`.tara-button[data-letra="${produto.letra}"]`);
            if (btnLetra) { // Se existe botão para a letra do produto
                btnLetra.classList.add('selected');
                letraPoteSel = produto.letra;
                spanLetra.textContent = `(${produto.letra})`;
            } else { // Produto tem tara, mas não botão correspondente (ou a letra é "Nenhuma")
                 if(produto.letra === 'Nenhuma') {
                     selecionaBotaoNenhuma();
                 } else {
                     // Define como manual se não achar botão ou se letra não for 'Nenhuma'
                    letraPoteSel = 'Manual';
                    spanLetra.textContent = '(Manual)';
                 }
            }
        } else {
            // Produto existe mas não tem tara definida OU a tara é 0 -> seleciona 'Nenhuma'
           selecionaBotaoNenhuma();
        }
    }
     // Se o usuário já digitou uma tara manualmente (letraPoteSel == 'Manual'), não sobrescreve.

  } else {
    nomeDiv.textContent = ''; // Limpa nome se código não encontrado
  }
   updateBotaoRegistrar();
}

/* ---------- Estado Botão Registrar ---------- */
function updateBotaoRegistrar() {
  // Precisa de usuário, código e peso COM POTE para habilitar
  btnReg.disabled = !(nomeUsuario && codigoInp.value.trim() && pesoComPoteInp.value.trim());
}

/* ---------- Armazenamento Local ---------- */
function carregaLocais() {
  itens = JSON.parse(localStorage.getItem(ITENS_KEY) || '[]');
}
function salvaLocais() {
  localStorage.setItem(ITENS_KEY, JSON.stringify(itens));
  renderizaLista(); // Atualiza a lista na tela sempre que salvar
}
function limparItensLocais() {
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

/* ---------- Registrar Item Localmente ---------- */
function registrarItemLocalmente() {
  updateBotaoRegistrar();
  if (btnReg.disabled) {
    alert('Preencha o código e o peso com pote para registrar.');
    return;
  };

  const codigo = codigoInp.value.trim();
  const tara = parseFloat(taraInp.value.replace(',', '.')) || 0;
  const pesoComPote = parseFloat(pesoComPoteInp.value.replace(',', '.'));
  const pesoExtra = parseFloat(pesoExtraInp.value.replace(',', '.')) || 0;

  if (isNaN(pesoComPote)) {
    mostraStatus('Erro: Peso COM POTE inválido.', 'error');
    pesoComPoteInp.focus();
    return;
  }
  if (isNaN(tara)) { // Adiciona verificação para tara
    mostraStatus('Erro: Peso da TARA inválido.', 'error');
    taraInp.focus();
    return;
  }
   if (isNaN(pesoExtra)) { // Adiciona verificação para peso extra, embora use 0 se falhar
    mostraStatus('Aviso: Peso Extra inválido, será considerado 0.', 'info', 3000);
  }


  const pesoLiquidoPote = pesoComPote - tara;
  const pesoLiquidoTotal = +(pesoLiquidoPote + pesoExtra).toFixed(3);

   if (pesoLiquidoTotal < 0) {
      mostraStatus('Erro: Peso Líquido TOTAL calculado é negativo. Verifique os valores.', 'error');
      return;
   }

  const produtoInfo = MAPA[codigo] || {};

  const novoItem = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    usuario: nomeUsuario,
    codigo: codigo,
    nomeProduto: produtoInfo.Nome || 'NÃO ENCONTRADO',
    pesoLiquido: pesoLiquidoTotal,
    tara: tara,
    pesoComPote: pesoComPote,
    pesoExtra: pesoExtra,
    letraPote: letraPoteSel || produtoInfo.letra || 'N/D'
  };

  itens.push(novoItem);
  salvaLocais(); // Salva e atualiza a lista

  // Limpa campos para próximo item
  codigoInp.value = '';
  taraInp.value = '';
  pesoComPoteInp.value = '';
  pesoExtraInp.value = '';
  nomeDiv.textContent = '';
  selecionaBotaoNenhuma(); // Seleciona 'Nenhuma' por padrão

  codigoInp.focus();
  mostraStatus('Item registrado localmente!', 'success', 2000);
  updateBotaoRegistrar(); // Desabilita botão após limpar campos obrigatórios
}

/* ---------- Renderizar Lista de Pendentes ---------- */
function renderizaLista() {
  tbody.innerHTML = ''; // Limpa tabela
  contadorPendentes.textContent = itens.length; // Atualiza contador

  if (itens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item local pendente.</td></tr>';
    enviarTodosBtn.disabled = true; // Desabilita botão se não há itens
    return;
  }

  enviarTodosBtn.disabled = enviando; // Habilita se houver itens E não estiver enviando

  // Ordena para mostrar os mais recentes primeiro na tabela
  [...itens].reverse().forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${item.codigo}</td>
      <td class="border px-2 py-1 text-right">${item.pesoLiquido.toFixed(3)}</td> <td class="border px-2 py-1 text-right">${item.tara.toFixed(3)} (${item.letraPote})</td>
      <td class="border px-2 py-1 text-xs text-center">${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700 p-1" data-id="${item.id}" title="Excluir este item">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    // Adiciona evento para botão de excluir
    tr.querySelector('button').addEventListener('click', () => excluirItem(item.id));
    tbody.appendChild(tr);
  });
}

function excluirItem(id) {
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


/* ---------- Envio para Google Apps Script ---------- */
async function enviarTodos() {
  if (enviando || itens.length === 0) return;

  enviando = true;
  enviarTodosBtn.disabled = true;
  btnLimpar.disabled = true;
  btnReg.disabled = true;
  mostraStatus(`Enviando ${itens.length} item(ns)...`, 'sending');

  const itensParaEnviar = [...itens];
  let enviadosComSucesso = 0;
  let falhas = 0;
  const idsEnviadosComSucesso = []; // Para remover do array original no final

  for (let i = 0; i < itensParaEnviar.length; i++) {
    const item = itensParaEnviar[i];
    mostraStatus(`Enviando ${i + 1}/${itensParaEnviar.length}: Código ${item.codigo}...`, 'sending');
    try {
      const resultadoEnvio = await enviarItem(item); // Espera resultado
       if (resultadoEnvio && resultadoEnvio.result === 'success' && resultadoEnvio.idLocal == item.id) {
           enviadosComSucesso++;
           idsEnviadosComSucesso.push(item.id); // Guarda ID se sucesso
       } else {
           // Se o script retornou erro ou resposta inesperada
           throw new Error(resultadoEnvio.message || 'Resposta inesperada do servidor.');
       }
    } catch (error) {
      console.error('Falha ao enviar item:', item.id, error);
      falhas++;
      // Não remove, deixa para próxima tentativa
      // Mostra erro específico da falha
      mostraStatus(`Falha item ${item.codigo}: ${error.message}`, 'error', 5000);
       // Pausa um pouco maior em caso de erro
      await new Promise(resolve => setTimeout(resolve, ENVIO_DELAY_MS * 2));
    }
    // Adiciona delay antes do próximo envio, mesmo se falhou, exceto no último
    if (i < itensParaEnviar.length - 1) {
      await new Promise(resolve => setTimeout(resolve, ENVIO_DELAY_MS));
    }
  }

   // Remove todos os itens que foram enviados com sucesso do array original 'itens'
  if(idsEnviadosComSucesso.length > 0) {
      itens = itens.filter(item => !idsEnviadosComSucesso.includes(item.id));
      salvaLocais(); // Salva a lista atualizada sem os itens enviados
  }


  // Finaliza o processo
  enviando = false;
  btnLimpar.disabled = false;
  updateBotaoRegistrar();
  renderizaLista(); // Atualiza estado final e contador

  // Mostra resultado final
  if (falhas === 0 && enviadosComSucesso > 0) {
    mostraStatus(`Todos os ${enviadosComSucesso} itens foram enviados com sucesso!`, 'success', 5000);
  } else if (falhas > 0 && enviadosComSucesso > 0) {
    mostraStatus(`${enviadosComSucesso} itens enviados, ${falhas} falharam. Tente enviar os pendentes novamente.`, 'error', 8000);
  } else if (falhas > 0 && enviadosComSucesso === 0) {
    mostraStatus(`Falha ao enviar todos os ${falhas} itens. Verifique a conexão/logs e tente novamente.`, 'error', 8000);
  } else if (falhas === 0 && enviadosComSucesso === 0 && itensParaEnviar.length > 0) {
     mostraStatus('Nenhum item enviado (sem falhas reportadas?). Verifique a lista.', 'info', 5000);
  } else { // Nenhum item original para enviar
     mostraStatus('Não havia itens para enviar.', 'info', 3000);
  }
}

// Função auxiliar para enviar um único item E RETORNAR A RESPOSTA
async function enviarItem(item) {
  const formData = new FormData();
  // Adiciona campos ao FormData
  formData.append('timestamp', item.timestamp);
  formData.append('usuario', item.usuario);
  formData.append('codigo', item.codigo);
  formData.append('nomeProduto', item.nomeProduto);
  formData.append('pesoLiquido', item.pesoLiquido); // Total
  formData.append('tara', item.tara);
  formData.append('pesoComPote', item.pesoComPote);
  formData.append('pesoExtra', item.pesoExtra);
  formData.append('letraPote', item.letraPote);
  formData.append('idLocal', item.id); // Crucial para confirmação

  console.log('Enviando item com ID local:', item.id);

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData,
      // mode: 'cors' // O padrão para fetch é 'cors', pode omitir
      // cache: 'no-cache' // Boa prática para POST
    });

     let responseData = {};
     const contentType = response.headers.get("content-type");

     if (contentType && contentType.indexOf("application/json") !== -1) {
         responseData = await response.json();
     } else {
         // Se não for JSON, trata como erro ou resposta inesperada
         const textResponse = await response.text();
         console.error("Resposta não JSON recebida do script:", response.status, response.statusText, textResponse);
         throw new Error(`Erro ${response.status}: ${response.statusText}. Resposta inesperada do servidor.`);
     }


    if (!response.ok) { // Checa status HTTP (4xx, 5xx)
      console.error('Erro HTTP ao enviar:', response.status, responseData);
      // Usa a mensagem do JSON se existir, senão usa o status HTTP
      throw new Error(responseData.message || `Erro de rede ${response.status}`);
    }

     // Se a resposta HTTP foi ok, mas o script indicou erro lógico
    if(responseData.result !== 'success') {
        console.error('Script retornou erro lógico:', responseData);
        throw new Error(responseData.message || `Erro desconhecido retornado pelo script.`);
    }

    // Se chegou aqui, foi sucesso
    console.log('Resposta de sucesso do script para idLocal', item.id, ':', responseData);
    return responseData; // Retorna o objeto JSON de sucesso

  } catch (error) {
    console.error("Falha no fetch ou processamento da resposta para idLocal:", item.id, error);
    // Propaga o erro para a função 'enviarTodos'
    // Retorna um objeto de erro padronizado para 'enviarTodos' saber que falhou
    return { result: 'error', message: error.message, idLocal: item.id };
     // throw error; // Alternativa: propagar o erro diretamente
  }
}


/* ---------- UI Feedback (Status) ---------- */
let statusTimeout;
function mostraStatus(mensagem, tipo = 'info', duracaoMs = 4000) {
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
