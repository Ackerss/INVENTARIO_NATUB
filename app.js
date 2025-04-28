/* ========= CONFIG ========= */
// ATENÇÃO: URL ATUALIZADO para o script que funcionou (ChatGPT)!
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby9BdmtpHuyxQzyfMVNPIXisx_ADVo-Nod_HmTv-5ayEKzMjTDglmxTUqkI_ZeB8exN/exec'; // <-- NOVO URL
const APP_VERSION = '28-abr-2025 - Merged Version';
const ENVIO_DELAY_MS = 500; // Intervalo de 0.5 segundos entre envios

/* ========= VARS ========= */
const ITENS_KEY = 'inv_granel_itens_v2'; // Chave pode mudar se a estrutura mudar
const NOME_USUARIO_KEY = 'inventarioGranelUsuario';
let nomeUsuario = '', enviando = false, letraPoteSel = 'Nenhuma', itens = [], MAPA = {};

/* refs DOM */
const $ = id => document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'), totalInp=$('pesoTotalKg'),
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
  await carregaPotes(); // Espera carregar potes antes de renderizar
  renderizaLista();
  verificaNomeUsuario();
  updateBotaoRegistrar(); // Atualiza estado inicial do botão registrar
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
  taraInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); totalInp.focus(); totalInp.select();} });
  totalInp.addEventListener('keydown', e => { if (goKeys.includes(e.key)) { e.preventDefault(); btnReg.click(); }});

  // Input Código Produto (Blur) -> Busca Tara Automática
  codigoInp.addEventListener('blur', buscaTaraAutomatica);

  // Botões Tara Rápida
  letras.addEventListener('click', handleTaraRapidaClick);

  // Input Tara Manual -> Desmarca botão rápido
  taraInp.addEventListener('input', handleTaraManualInput);

  // Botão Registrar Item Localmente
  btnReg.addEventListener('click', registrarItemLocalmente);

  // Botão Enviar Todos
  enviarTodosBtn.addEventListener('click', enviarTodos);

  // Botão Limpar Locais
  btnLimpar.addEventListener('click', limparItensLocais);

  // Habilita/Desabilita botão Registrar ao digitar
  [codigoInp, taraInp, totalInp].forEach(el => el.addEventListener('input', updateBotaoRegistrar));
}

/* ---------- Nome Usuário ---------- */
function verificaNomeUsuario() {
  nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
  if (!nomeUsuario) {
    abrirModalNome();
  } else {
    mostrarNome();
    updateBotaoRegistrar(); // Habilita botão se nome já existe
  }
}
function abrirModalNome() {
  inpNome.value = nomeUsuario; // Preenche com nome atual se existir
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
  updateBotaoRegistrar(); // Pode habilitar o botão registrar agora
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
    letras.innerHTML = ''; // Limpa container
    const potesUnicos = {};
    Object.values(MAPA).forEach(p => {
        if (p.letra && p.tara !== undefined && !potesUnicos[p.letra]) {
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
        letras.appendChild(btn);
    });
    // Adiciona o botão "Nenhuma" fixo que já está no HTML
}

function handleTaraRapidaClick(event) {
    const btn = event.target.closest('.tara-button');
    if (!btn) return;
    desmarcaBotoesTara();
    btn.classList.add('selected');
    taraInp.value = parseFloat(btn.dataset.taraKg).toFixed(3);
    letraPoteSel = btn.dataset.letra;
    spanLetra.textContent = `(${letraPoteSel})`;
    totalInp.focus(); // Move foco para peso total
    totalInp.select();
}

function handleTaraManualInput() {
    desmarcaBotoesTara();
    letraPoteSel = 'Manual'; // Indica que foi digitado manualmente
    spanLetra.textContent = '(Manual)';
}

function desmarcaBotoesTara() {
    letras.querySelectorAll('.tara-button.selected').forEach(b => b.classList.remove('selected'));
    // Desmarca também o botão "Nenhuma" se estiver selecionado
    const btnNenhuma = document.querySelector('.tara-button[data-letra="Nenhuma"]');
    if(btnNenhuma) btnNenhuma.classList.remove('selected');

}

/* ---------- Busca Tara Automática ---------- */
function buscaTaraAutomatica() {
  const codigo = codigoInp.value.trim();
  const produto = MAPA[codigo];
  if (produto) {
    nomeDiv.textContent = produto.Nome || 'Produto sem nome';
    // Só preenche a tara se o campo estiver vazio
    if (!taraInp.value.trim() && produto.tara !== undefined) {
        taraInp.value = parseFloat(produto.tara).toFixed(3);
        desmarcaBotoesTara();
        const btnLetra = letras.querySelector(`.tara-button[data-letra="${produto.letra}"]`);
        if (btnLetra) {
            btnLetra.classList.add('selected');
            letraPoteSel = produto.letra;
            spanLetra.textContent = `(${produto.letra})`;
        } else {
            letraPoteSel = 'Manual'; // Produto tem tara mas não tem botão? Usa manual.
             spanLetra.textContent = '(Manual)';
        }
    } else if (!produto.tara) {
        // Se o produto não tem tara definida, seleciona 'Nenhuma'
        taraInp.value = ''; // Limpa tara manual se houver
        desmarcaBotoesTara();
        const btnNenhuma = document.querySelector('.tara-button[data-letra="Nenhuma"]');
        if(btnNenhuma) btnNenhuma.classList.add('selected');
        letraPoteSel = 'Nenhuma';
        spanLetra.textContent = '(Nenhuma)';
    }
  } else {
    nomeDiv.textContent = ''; // Limpa nome se código não encontrado
  }
   updateBotaoRegistrar();
}

/* ---------- Estado Botão Registrar ---------- */
function updateBotaoRegistrar() {
  btnReg.disabled = !(nomeUsuario && codigoInp.value.trim() && totalInp.value.trim());
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
  updateBotaoRegistrar(); // Revalida
  if (btnReg.disabled) return;

  const codigo = codigoInp.value.trim();
  const tara = parseFloat(taraInp.value.replace(',', '.')) || 0;
  const pesoTotal = parseFloat(totalInp.value.replace(',', '.'));
  const pesoLiquido = +(pesoTotal - tara).toFixed(3); // Arredonda para 3 casas decimais

  if (isNaN(pesoTotal)) {
    mostraStatus('Erro: Peso total inválido.', 'error');
    return;
  }
   if (pesoLiquido < 0) {
      mostraStatus('Erro: Peso líquido negativo. Verifique Tara e Peso Total.', 'error');
      return;
   }


  const produtoInfo = MAPA[codigo] || {};

  const novoItem = {
    id: Date.now(), // ID único baseado no timestamp
    timestamp: new Date().toISOString(),
    usuario: nomeUsuario,
    codigo: codigo,
    nomeProduto: produtoInfo.Nome || 'NÃO ENCONTRADO',
    pesoLiquido: pesoLiquido,
    tara: tara,
    pesoTotal: pesoTotal,
    letraPote: letraPoteSel || produtoInfo.letra || 'N/D' // Usa a letra selecionada ou do produto
  };

  itens.push(novoItem);
  salvaLocais(); // Salva e atualiza a lista na tela

  // Limpa campos para próximo item
  codigoInp.value = '';
  taraInp.value = '';
  totalInp.value = '';
  nomeDiv.textContent = '';
  desmarcaBotoesTara();
  const btnNenhuma = document.querySelector('.tara-button[data-letra="Nenhuma"]');
  if(btnNenhuma) btnNenhuma.classList.add('selected'); // Seleciona 'Nenhuma' por padrão
  letraPoteSel = 'Nenhuma';
  spanLetra.textContent = '(Nenhuma)';


  codigoInp.focus(); // Foco no código para próximo item
  mostraStatus('Item registrado localmente!', 'success', 2000); // Feedback visual
  updateBotaoRegistrar(); // Desabilita botão após limpar campos
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

  itens.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${item.codigo}</td>
      <td class="border px-2 py-1">${item.pesoLiquido.toFixed(3)}</td>
      <td class="border px-2 py-1">${item.tara.toFixed(3)} (${item.letraPote})</td>
      <td class="border px-2 py-1 text-xs">${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700" data-id="${item.id}" title="Excluir este item">
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
  btnLimpar.disabled = true; // Desabilita limpar durante envio
  btnReg.disabled = true; // Desabilita registrar durante envio
  mostraStatus(`Enviando ${itens.length} item(ns)...`, 'sending');

  const itensParaEnviar = [...itens]; // Cria cópia para evitar problemas se a lista for modificada
  let enviadosComSucesso = 0;
  let falhas = 0;

  for (let i = 0; i < itensParaEnviar.length; i++) {
    const item = itensParaEnviar[i];
    mostraStatus(`Enviando ${i + 1}/${itensParaEnviar.length}: Código ${item.codigo}...`, 'sending');
    try {
      await enviarItem(item);
      // Se sucesso, remove da lista original 'itens'
      const indexOriginal = itens.findIndex(original => original.id === item.id);
      if (indexOriginal > -1) {
        itens.splice(indexOriginal, 1);
      }
      enviadosComSucesso++;
      salvaLocais(); // Salva a remoção e atualiza a lista na tela
    } catch (error) {
      console.error('Falha ao enviar item:', item.id, error);
      falhas++;
      // Não remove o item da lista local se falhar, para tentar novamente depois
    }
    // Adiciona delay antes do próximo envio, exceto no último
    if (i < itensParaEnviar.length - 1) {
      await new Promise(resolve => setTimeout(resolve, ENVIO_DELAY_MS));
    }
  }

  // Finaliza o processo
  enviando = false;
  btnLimpar.disabled = false;
  updateBotaoRegistrar(); // Reabilita baseado nos campos
  renderizaLista(); // Atualiza estado final do botão Enviar Todos

  // Mostra resultado final
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

// Função auxiliar para enviar um único item
async function enviarItem(item) {
  const formData = new FormData();
  formData.append('timestamp', item.timestamp);
  formData.append('usuario', item.usuario);
  formData.append('codigo', item.codigo);
  formData.append('nomeProduto', item.nomeProduto);
  formData.append('pesoLiquido', item.pesoLiquido);
  formData.append('tara', item.tara);
  formData.append('pesoTotal', item.pesoTotal);
  formData.append('letraPote', item.letraPote);
  formData.append('idLocal', item.id); // Envia ID local para referência

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData,
      // Não definimos 'mode: no-cors' pois esperamos JSON
    });

     // Tenta ler como JSON, mesmo se não for ok, pode ter msg de erro
     let responseData = {};
     try {
       responseData = await response.json();
     } catch (jsonError) {
        // Se não for JSON válido, tenta ler como texto
        const textResponse = await response.text();
        console.error("Resposta não era JSON:", textResponse);
        throw new Error(`Erro ${response.status}: Resposta inválida do servidor. ${textResponse.substring(0,100)}`);
     }


    // Agora verifica se a resposta JSON indica sucesso (baseado no script que funcionou)
    if (!response.ok || responseData.result !== 'success') {
      console.error('Resposta do Script não foi sucesso:', responseData);
      throw new Error(responseData.message || `Erro ${response.status}`);
    }

    console.log('Item enviado com sucesso:', item.id, responseData);
    // Não precisa retornar nada, o sucesso é indicado pela ausência de erro

  } catch (networkOrScriptError) {
    console.error("Erro de rede ou script ao enviar item:", networkOrScriptError);
    // Propaga o erro para a função 'enviarTodos' tratar
    throw networkOrScriptError;
  }
}


/* ---------- UI Feedback (Status) ---------- */
let statusTimeout;
function mostraStatus(mensagem, tipo = 'info', duracaoMs = 4000) {
  clearTimeout(statusTimeout); // Limpa timeout anterior, se houver
  status.textContent = mensagem;
  // Define a classe baseada no tipo (info, success, error, sending)
  status.className = `status-base status-${tipo}`;
  status.style.display = 'block'; // Garante que está visível

  // Esconde a mensagem após a duração, exceto se for 'sending'
  if (tipo !== 'sending' && duracaoMs > 0) {
    statusTimeout = setTimeout(() => {
      status.style.display = 'none';
      status.textContent = '';
      status.className = 'status-base';
    }, duracaoMs);
  }
}
