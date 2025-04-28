/* ========= CONFIG ========= */
// !!! URL ATUALIZADO PARA O NOVO SCRIPT !!!
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyAfQErmC-4Q2fDnv0txDUYNdj7PsNp9aaVu_my1C5kYt7mJ1qqwON6l5PeQ4KFx-rRDw/exec';
const APP_VERSION = '27-abr-2025 r4 - Novo Script'; // Versão atualizada para referência

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
      // Você pode querer desabilitar funcionalidades aqui se o mapa for essencial
  }
}


/* ---------- NOME ---------- */
function pedeNome(){
  nomeUsuario = localStorage.getItem('inv_nome') || '';
  if(!nomeUsuario){
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      inpNome.focus(); // Foca no input ao abrir o modal
  }
  nomeDisp.textContent = nomeUsuario ? `Olá, ${nomeUsuario}!` : '';
  atualizaBotao();
}

function salvaNome(n){
  n = (n || '').trim(); // Garante que n é string e remove espaços
  if (!n) return; // Não salva nome vazio
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
    // Valida se são arrays
    if (!Array.isArray(itens)) itens = [];
    if (!Array.isArray(itensEnviados)) itensEnviados = [];
  } catch (e) {
    console.error("Erro ao carregar dados locais:", e);
    itens = []; // Reseta se houver erro de parse
    itensEnviados = [];
    localStorage.removeItem(ITENS_KEY); // Remove dados corrompidos
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
  atualizaContadorItens(); // Atualiza contador mesmo se falhar, para refletir o estado atual da variável 'itens'
}

function atualizaContadorItens() {
  // Atualiza texto do botão com contagem de itens
  const numItens = itens.length;
  enviarTodosBtn.textContent = `Enviar ${numItens} Item(s) Pendente(s)`;
  enviarTodosBtn.disabled = numItens === 0 || enviando || !nomeUsuario;
}

function render(){
  tbody.innerHTML = ''; // Limpa a tabela
  if (!itens.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item pendente de envio.</td></tr>';
    return;
  }
  // Renderiza do mais recente para o mais antigo
  [...itens].reverse().forEach((it, indexReverso) => {
    const originalIndex = itens.length - 1 - indexReverso; // Calcula o índice original
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
  // Desabilita botões se estiver enviando ou se não houver nome de usuário
  const desabilitar = enviando || !nomeUsuario;
  btnReg.disabled = desabilitar;
  enviarTodosBtn.disabled = desabilitar || itens.length === 0; // Desabilita também se não houver itens
}

function resetForm(){
  codigoInp.value = '';
  taraInp.value = '';
  totalInp.value = '';
  nomeDiv.textContent = ''; // Limpa nome do produto
  letraPoteSel = 'Nenhuma'; // Reseta letra selecionada
  spanLetra.textContent = ''; // Limpa display da letra
  desmarcaBotoes();
  codigoInp.focus(); // Foca no campo código
}

function desmarcaBotoes(){
  letras.querySelectorAll('.tara-button.selected').forEach(b => b.classList.remove('selected'));
}

function mostraStatus(mensagem, tipo = 'info', tempo = 7000) {
    status.textContent = mensagem;
    status.className = `status-${tipo}`; // Usa classes CSS como status-info, status-success, status-error, status-sending
    status.style.display = 'block'; // Garante que está visível

    // Limpa a mensagem após um tempo, exceto se for 'sending'
    if (tipo !== 'sending' && tempo > 0) {
        setTimeout(() => {
            // Só limpa se a mensagem ainda for a mesma (evita limpar status de envio posterior)
            if (status.textContent === mensagem) {
                 status.textContent = '';
                 status.style.display = 'none';
                 status.className = ''; // Limpa a classe
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

  // Validação dos campos
  if(!codigo) { alert('Código do produto é obrigatório.'); codigoInp.focus(); return; }
  if(!pesoTotStr) { alert('Peso total é obrigatório.'); totalInp.focus(); return; }

  const pesoTot = parseFloat(pesoTotStr);
  const tara = parseFloat(taraStr) || 0; // Tara é opcional, default 0

  if(isNaN(pesoTot)) { alert('Peso total inválido.'); totalInp.focus(); return; }
  if(isNaN(tara)) { alert('Peso da tara inválido.'); taraInp.focus(); return; }

  const pesoLiq = pesoTot - tara;
  if(pesoLiq <= 0) { alert('Peso líquido deve ser maior que zero (Peso Total - Tara).'); return; }

  // Busca nome do produto no mapa local (MAPA)
  const produtoInfo = MAPA[codigo] || {};
  const nomeProduto = produtoInfo.nome || ''; // Pega nome do mapa ou deixa vazio

  // Payload para enviar e salvar localmente
  const itemPayload = {
    usuario: nomeUsuario,
    codigo: codigo,
    nomeProduto: nomeProduto, // Nome vindo do mapa
    pesoLiquido: pesoLiq,
    tara: tara,
    pesoTotal: pesoTot,
    letraPote: letraPoteSel // Letra selecionada ou 'Manual'/'Nenhuma'
  };

  // Payload para salvar localmente (estrutura ligeiramente diferente)
   const itemLocal = {
      codigo: codigo,
      pLiq: pesoLiq,
      tara: tara,
      dt: Date.now(), // Timestamp local
      // Adiciona outros campos para possível uso futuro ou envio em lote
      usuario: nomeUsuario,
      nomeProduto: nomeProduto,
      pesoTotal: pesoTot,
      letraPote: letraPoteSel
    };

  enviando = true;
  atualizaBotao();
  mostraStatus('Enviando item...', 'sending', 0); // 0 para não limpar automaticamente

  try {
    // 1. Salva localmente PRIMEIRO
    itens.push(itemLocal);
    salvaLocais(); // Salva no localStorage
    render(); // Atualiza a tabela de itens locais

    // 2. Tenta enviar ao Google Script
    console.log("Enviando payload:", JSON.stringify(itemPayload)); // Log para depuração
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors', // Essencial para requisições cross-origin
      cache: 'no-cache', // Evita cache da requisição POST
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(itemPayload) // Envia payload preparado
    });

    // Verifica se a resposta da rede foi OK (status 2xx)
    if (!response.ok) {
        let errorMsg = `Erro de rede: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json(); // Tenta ler corpo do erro como JSON
            errorMsg += ` - ${errorData.message || 'Sem detalhes adicionais'}`;
        } catch (parseError) {
            // Ignora se o corpo do erro não for JSON
        }
        throw new Error(errorMsg); // Lança erro de rede
    }

    const data = await response.json(); // Lê a resposta JSON do script

    // Verifica a resposta lógica do script
    if (data.result === 'success') {
      // Se o script confirmou sucesso:
      // - Move o item da lista local 'itens' para 'itensEnviados'
      itensEnviados.push(itemLocal); // Adiciona aos enviados
      itens = itens.filter(it => it.dt !== itemLocal.dt); // Remove dos pendentes pelo timestamp
      salvaLocais(); // Atualiza localStorage
      render(); // Atualiza a tabela

      mostraStatus('Item enviado com sucesso!', 'success');
      resetForm(); // Limpa o formulário

    } else {
      // Se o script retornou um erro lógico
      throw new Error(data.message || 'Erro desconhecido retornado pelo servidor.');
    }

  } catch (e) {
    // Captura erros de rede ou erros lançados manualmente
    console.error('Falha no envio:', e);
    mostraStatus(`Erro: ${e.message}. Item salvo localmente.`, 'error', 15000); // Mostra erro por mais tempo
    // Não reseta o formulário em caso de erro para permitir correção/nova tentativa
    // O item já foi salvo localmente antes do fetch, então está seguro.
  } finally {
    enviando = false; // Libera o estado de envio
    atualizaBotao(); // Reabilita os botões conforme necessário
    // Não limpa o status aqui, a função mostraStatus cuida disso
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
  const itensParaEnviar = [...itens]; // Cria cópia para iterar, pois 'itens' será modificado
  const itensEnviadosNestaRodada = [];
  const itensFalharamNestaRodada = [];

  for(let i = 0; i < itensParaEnviar.length; i++) {
    const item = itensParaEnviar[i];
    mostraStatus(`Enviando ${i+1}/${itensParaEnviar.length}...`, 'sending', 0);

    // Monta o payload a partir do item local salvo
    const payload = {
      usuario: item.usuario || nomeUsuario, // Usa o usuário do item ou o atual
      codigo: item.codigo,
      nomeProduto: item.nomeProduto || (MAPA[item.codigo] ? MAPA[item.codigo].nome : ''), // Garante nome do produto
      pesoLiquido: item.pLiq,
      tara: item.tara,
      pesoTotal: item.pesoTotal || (item.pLiq + item.tara), // Calcula se não existir
      letraPote: item.letraPote || 'Nenhuma'
    };

    try {
      console.log(`Enviando item ${i+1}:`, JSON.stringify(payload));
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
          let errorMsg = `Erro de rede: ${response.status} ${response.statusText}`;
          try { const errorData = await response.json(); errorMsg += ` - ${errorData.message || ''}`; } catch (e) {}
          throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.result === 'success') {
        sucesso++;
        itensEnviadosNestaRodada.push(item); // Marca para mover depois
      } else {
        throw new Error(data.message || 'Erro desconhecido no servidor');
      }

      // Pequena pausa para não sobrecarregar (opcional, mas recomendado)
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms

    } catch (e) {
      console.error(`Erro ao enviar item ${i+1} (Código: ${item.codigo}):`, e);
      falhas++;
      itensFalharamNestaRodada.push(item); // Mantém na lista de pendentes
      // Continua para o próximo item
    }
  }

  // Processa os resultados após o loop
  if (itensEnviadosNestaRodada.length > 0) {
      // Adiciona aos enviados gerais
      itensEnviados.push(...itensEnviadosNestaRodada);
      // Remove dos pendentes originais (comparando por timestamp 'dt')
      const timestampsEnviados = new Set(itensEnviadosNestaRodada.map(it => it.dt));
      itens = itens.filter(it => !timestampsEnviados.has(it.dt));
      salvaLocais(); // Salva o estado atualizado
      render(); // Re-renderiza a lista de pendentes
  }

  // Define a mensagem final
  if (falhas === 0 && sucesso > 0) {
    mostraStatus(`Enviados ${sucesso} itens com sucesso!`, 'success');
  } else if (sucesso > 0 && falhas > 0) {
    mostraStatus(`Enviados ${sucesso} itens, ${falhas} falharam e permanecem pendentes.`, 'error', 15000);
  } else if (sucesso === 0 && falhas > 0) {
    mostraStatus(`Falha ao enviar ${falhas} itens. Eles permanecem pendentes.`, 'error', 15000);
  } else { // sucesso === 0 && falhas === 0 (não deveria acontecer se itens.length > 0)
    mostraStatus('Nenhum item foi processado?', 'info');
  }

  enviando = false; // Libera estado de envio
  atualizaBotao(); // Atualiza estado dos botões
}

/* ---------- LISTENERS (Ouvintes de Eventos) ---------- */
function addListeners(){
  btnReg.onclick = enviar; // Botão de registrar/enviar individual
  enviarTodosBtn.onclick = enviarTodos; // Botão de enviar todos os pendentes

  // Atalhos com Enter para fluidez
  codigoInp.addEventListener('keydown', e => {if(e.key === 'Enter'){ e.preventDefault(); taraInp.focus(); }});
  taraInp.addEventListener('keydown', e => {if(e.key === 'Enter'){ e.preventDefault(); totalInp.focus(); }});
  totalInp.addEventListener('keydown', e => {if(e.key === 'Enter'){ e.preventDefault(); btnReg.click(); }}); // Simula clique no botão

  // Quando o campo código perde o foco, busca info do produto
  codigoInp.addEventListener('blur', () => {
    const codigo = codigoInp.value.trim();
    const d = MAPA[codigo]; // Busca no mapa local
    if (!d) {
        nomeDiv.textContent = ''; // Limpa se não achar
        // Não limpa a tara automaticamente se não achar o código
        return;
    }
    nomeDiv.textContent = d.nome; // Mostra nome
    // Só preenche tara se o campo estiver vazio
    if (!taraInp.value && d.tara !== undefined && d.tara !== null) {
        taraInp.value = d.tara.toFixed(3);
    }
    // Seleciona botão de letra correspondente, se existir
    desmarcaBotoes();
    const b = letras.querySelector(`.tara-button[data-letra="${d.letra}"]`);
    if (b) {
        b.classList.add('selected');
        letraPoteSel = d.letra;
        spanLetra.textContent = `(${d.letra})`;
    } else {
        // Se não achar botão correspondente, reseta para Nenhuma/Manual
        letraPoteSel = 'Manual';
        spanLetra.textContent = '(Manual)';
    }
  });

  // Clique nos botões de tara rápida
  letras.addEventListener('click', e => {
    const b = e.target.closest('.tara-button');
    if (!b) return; // Ignora cliques fora dos botões
    desmarcaBotoes();
    b.classList.add('selected');
    taraInp.value = parseFloat(b.dataset.taraKg).toFixed(3); // Define tara
    letraPoteSel = b.dataset.letra; // Define letra
    spanLetra.textContent = `(${letraPoteSel})`;
    totalInp.focus(); // Move foco para peso total
  });

  // Se a tara for digitada manualmente, desmarca botões e define letra como 'Manual'
  taraInp.addEventListener('input', () => {
    desmarcaBotoes();
    letraPoteSel = 'Manual';
    spanLetra.textContent = '(Manual)';
  });

  // Botão para limpar registros locais pendentes
  document.getElementById('limparSessaoLocalBtn').onclick = () => {
    if (itens.length === 0) {
        alert("Não há registros locais pendentes para limpar.");
        return;
    }
    if (confirm(`Tem certeza que deseja limpar os ${itens.length} registros locais pendentes?\nEsta ação não pode ser desfeita.`)) {
        itens = []; // Limpa array
        salvaLocais(); // Salva array vazio no localStorage
        render(); // Atualiza a tabela
        alert("Registros locais limpos.");
    }
  };

  // Delegação de evento para exclusão na tabela de itens locais
  tbody.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.i !== undefined) {
      const indexParaExcluir = parseInt(e.target.dataset.i, 10);
      if (!isNaN(indexParaExcluir) && indexParaExcluir >= 0 && indexParaExcluir < itens.length) {
        const itemExcluir = itens[indexParaExcluir];
        if (confirm(`Deseja excluir localmente o item com código ${itemExcluir.codigo}?`)) {
            itens.splice(indexParaExcluir, 1); // Remove o item do array 'itens'
            salvaLocais(); // Atualiza localStorage
            render(); // Re-renderiza a tabela
        }
      }
    }
  });

  // Botões e ações do Modal de Nome de Usuário
  document.getElementById('alterarNomeBtn').onclick = () => {
      inpNome.value = nomeUsuario; // Preenche com nome atual ao abrir
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      inpNome.focus(); // Foca no input
  };

  document.getElementById('salvarNomeUsuarioBtn').onclick = () => salvaNome(inpNome.value);
  // Salvar nome com Enter no input do modal
  inpNome.addEventListener('keydown', e => { if(e.key === 'Enter') salvaNome(inpNome.value); });
  // Fechar modal clicando fora (no overlay) - opcional
  overlay.onclick = () => {
      overlay.classList.add('hidden');
      modal.classList.add('hidden');
  };
}

// ----- FIM DO app.js -----
