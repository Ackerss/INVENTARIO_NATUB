// v13 - Estrutura revisada para estabilidade e logs

// Função principal assíncrona para garantir a ordem de carregamento
async function main() {
    console.log('Iniciando app.js v13 (Stable)...');

    // --- URL DO SEU SCRIPT PUBLICADO ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9_BwTH7ddUY7I9Am7MOwvAXz6Lj4KQRPrnKZhzzfxmF3fDozm5DDDAjNXH7VrEhmdnw/exec'; // SEU URL

    if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_PUBLICADO') {
        alert("ATENÇÃO DESENVOLVEDOR: Cole o URL do seu Google Apps Script publicado na variável GOOGLE_SCRIPT_URL no arquivo app.js!");
        console.error("URL do Google Apps Script não configurada em app.js");
        // Poderia desabilitar o botão de envio aqui se o URL não estiver configurado
    }

    /* ---------- refs DOM ---------- */
    const el = id => document.getElementById(id);
    let codigoProdutoInput, nomeProdutoDisplayDiv, pesoTotalKgInput, pesoTaraKgInput, registrarItemBtn, listaItensBody, botoesTaraContainer, statusEnvioDiv, nomeUsuarioDisplay, overlayNomeUsuario, modalNomeUsuario, inputNomeUsuario, salvarNomeUsuarioBtn, limparSessaoLocalBtn, alterarNomeBtn, letraPoteSelecionadoSpan;

    try {
        // Tenta obter todas as referências
        codigoProdutoInput = el('codigoProduto'); nomeProdutoDisplayDiv = el('nomeProdutoDisplay');
        pesoTotalKgInput   = el('pesoTotalKg'); pesoTaraKgInput = el('pesoTaraKg');
        registrarItemBtn   = el('registrarItemBtn'); listaItensBody = el('listaItensBody');
        botoesTaraContainer= el('botoesTaraContainer'); statusEnvioDiv = el('statusEnvio');
        nomeUsuarioDisplay = el('nomeUsuarioDisplay'); overlayNomeUsuario = el('overlayNomeUsuario');
        modalNomeUsuario   = el('modalNomeUsuario'); inputNomeUsuario = el('inputNomeUsuario');
        salvarNomeUsuarioBtn= el('salvarNomeUsuarioBtn'); limparSessaoLocalBtn = el('limparSessaoLocalBtn');
        alterarNomeBtn     = el('alterarNomeBtn'); letraPoteSelecionadoSpan = el('letraPoteSelecionado');

        // Verifica se algum elemento essencial está faltando
        const refs = { codigoProdutoInput, nomeProdutoDisplayDiv, pesoTotalKgInput, pesoTaraKgInput, registrarItemBtn, listaItensBody, botoesTaraContainer, statusEnvioDiv, nomeUsuarioDisplay, overlayNomeUsuario, modalNomeUsuario, inputNomeUsuario, salvarNomeUsuarioBtn, limparSessaoLocalBtn, alterarNomeBtn, letraPoteSelecionadoSpan };
        for (const key in refs) {
            if (!refs[key]) {
                throw new Error(`Elemento do DOM não encontrado: ${key}`);
            }
        }
        console.log('Elementos do DOM referenciados com sucesso.');
    } catch (error) {
         console.error("ERRO CRÍTICO ao referenciar elementos do DOM:", error);
         alert(`Erro fatal ao carregar a interface: ${error.message}. Verifique o console (F12).`);
         return; // Interrompe a execução se elementos cruciais faltarem
    }

    /* ---------- storage (LocalStorage) ---------- */
    const ITENS_KEY_LOCAL = 'inventarioGranelItens_vLocal';
    const NOME_USUARIO_KEY = 'inventarioGranelUsuario';
    let itensLocais = [];
    let nomeUsuario = '';

    /* ---------- Estado ---------- */
    let letraPoteSelecionada = 'Nenhuma';
    let enviandoDados = false;
    const MAPA_PRODUTOS  = {}; // Mapa para guardar { codigo: { nome, tara, letra } }

    /* ---------- Carrega potes.json ---------- */
    // Função separada para carregar o JSON
    async function carregarMapaProdutos() {
        try {
            console.log('Carregando potes.json...');
            const resp = await fetch('potes.json', { cache: 'no-store' });
            if (resp.ok) {
                const arrPotes = await resp.json();
                console.log(`potes.json lido, ${arrPotes.length} entradas.`);
                arrPotes.forEach(pote => {
                    const codigoStr = String(pote.codigo).trim();
                    const taraNum = parseFloat(pote.tara);
                    const nomeProd = String(pote.Nome || 'Nome Indefinido').trim();
                    const letraPote = String(pote.letra || 'N/A').trim();
                    if (codigoStr && !isNaN(taraNum)) {
                        MAPA_PRODUTOS[codigoStr] = { nome: nomeProd, tara: taraNum, letra: letraPote };
                    } else { console.warn('Entrada inválida no potes.json:', pote); }
                });
                console.log(`MAPA_PRODUTOS populado com ${Object.keys(MAPA_PRODUTOS).length} códigos.`);
            } else {
                console.error(`Falha ao carregar potes.json: ${resp.status} ${resp.statusText}`);
                alert('Atenção: Não foi possível carregar a lista de produtos (potes.json). A busca automática pode não funcionar.');
            }
        } catch (e) {
            console.error('Erro crítico ao processar potes.json:', e);
            alert('Erro ao processar a lista de produtos (potes.json). Verifique o console.');
        }
    }

    /* ---------- util ---------- */
    const parsePtBrDate = str => { /* ... */ };
    const desmarcarBotoesTara = () => { /* ... */ };

    /* ---------- Habilitar/Desabilitar Botão Registrar ---------- */
    function atualizarEstadoBotaoRegistrar() {
        // Habilita SOMENTE se um nome de usuário estiver definido E não estiver enviando dados
        const habilitar = !!nomeUsuario && !enviandoDados;
        registrarItemBtn.disabled = !habilitar;
        console.log(`[atualizarEstadoBotaoRegistrar] Nome: ${nomeUsuario ? 'OK' : 'Falta'}, Enviando: ${enviandoDados}. Botão ${habilitar ? 'HABILITADO' : 'DESABILITADO'}.`);
    }

    /* ---------- Gerenciamento Nome Usuário ---------- */
    function salvarNomeUsuario(nome) {
        nome = nome.trim();
        if (nome) {
            localStorage.setItem(NOME_USUARIO_KEY, nome);
            nomeUsuario = nome;
            nomeUsuarioDisplay.textContent = `Olá, ${nome}!`;
            nomeUsuarioDisplay.title = "Clique para alterar seu nome";
            modalNomeUsuario.style.display = 'none';
            overlayNomeUsuario.style.display = 'none';
            console.log("Nome do usuário salvo:", nome);
            atualizarEstadoBotaoRegistrar(); // Atualiza estado do botão
        } else {
            alert("Por favor, digite um nome válido.");
            atualizarEstadoBotaoRegistrar(); // Garante que botão fique desabilitado
        }
    }

    function pedirNomeUsuario() {
        nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
        if (!nomeUsuario) {
            console.log("Nenhum nome de usuário salvo, solicitando...");
            overlayNomeUsuario.style.display = 'block';
            modalNomeUsuario.style.display = 'block';
            inputNomeUsuario.focus();
        } else {
            console.log("Nome do usuário carregado:", nomeUsuario);
            nomeUsuarioDisplay.textContent = `Olá, ${nomeUsuario}!`;
            nomeUsuarioDisplay.title = "Clique para alterar seu nome";
        }
        atualizarEstadoBotaoRegistrar(); // Atualiza estado do botão em ambos os casos
    }

    /* ---------- Persistência e Interface Local (Opcional) ---------- */
    const salvarItensLocais = () => { /* ... */ };
    const carregarItensLocais = () => { /* ... */ };
    function renderizarListaItensLocais() { /* ... */ }
    function excluirItemLocal(index) { /* ... */ }

    /* ---------- Buscar Tara e Nome Automáticos ---------- */
    function buscarDadosProdutoAutomaticamente() { /* ... (igual v11) ... */ }

    /* ---------- Registrar e Enviar para Google Sheets ---------- */
    async function registrarEEnviarItem() {
        if (enviandoDados) { console.warn("Envio já em progresso."); return; }
        if (!nomeUsuario) { alert("Defina seu nome de usuário."); pedirNomeUsuario(); return; }
        if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_PUBLICADO') { alert("Erro: URL do Script não configurada."); return; }

        console.log("Iniciando registrarEEnviarItem...");
        enviandoDados = true; // Define flag ANTES de desabilitar
        atualizarEstadoBotaoRegistrar(); // Desabilita botão via flag
        statusEnvioDiv.textContent = 'Enviando...'; statusEnvioDiv.className = 'sending';
        let nomeProdutoEncontrado = "N/A";

        try {
            /* ... (Lógica de validação e preparação dos dados - igual v11) ... */
            const codigo = codigoProdutoInput.value.trim(); /*...*/
            const pesoTotalKg = /*...*/; let taraKg = /*...*/; const pesoLiquidoKg = /*...*/;
            if (MAPA_PRODUTOS[codigo]) { nomeProdutoEncontrado = MAPA_PRODUTOS[codigo].nome || "N/A"; }
            else { nomeProdutoEncontrado = "(Código não encontrado)"; }
            const dadosParaEnviar = { /* ... */ };

            console.log("Dados a serem enviados:", JSON.stringify(dadosParaEnviar));
            console.log("Enviando fetch para:", GOOGLE_SCRIPT_URL);
            const response = await fetch(GOOGLE_SCRIPT_URL, { /* ... Opções Fetch ... */ });
            /* ... (Tratamento da Resposta - igual v11) ... */
            const responseText = await response.text(); /*...*/ let responseData = {}; /*...*/
            if (!response.ok || responseData.result !== 'success') { throw new Error(/*...*/); }

            // --- Sucesso ---
            console.log("Dados enviados com sucesso!");
            statusEnvioDiv.textContent = 'Enviado com sucesso!'; statusEnvioDiv.className = 'success flash-success';
            /* ... (Adiciona log local, Limpa formulário) ... */
            pesoTotalKgInput.value = ''; codigoProdutoInput.value = ''; pesoTaraKgInput.value = ''; nomeProdutoDisplayDiv.textContent = '';
            desmarcarBotoesTara(); codigoProdutoInput.focus();

        } catch (error) {
            /* ... (Tratamento de erro igual v11) ... */
            console.error("Falha ao enviar dados:", error);
            statusEnvioDiv.textContent = `Erro ao enviar: ${error.message}`; statusEnvioDiv.className = 'error flash-error';
            alert(`Falha ao enviar: ${error.message}`);
        } finally {
            enviandoDados = false; // Reseta flag
            atualizarEstadoBotaoRegistrar(); // Reabilita botão (se nomeUsuario estiver ok)
            console.log("registrarEEnviarItem finalizado.");
            setTimeout(() => { statusEnvioDiv.textContent = ''; statusEnvioDiv.style.display = 'none'; }, 7000);
        }
    }

    /* ---------- Eventos ---------- */
    // Adiciona listeners DENTRO de um try...catch geral para a inicialização
    try {
        console.log("Adicionando event listeners...");

        // Botão principal
        registrarItemBtn.addEventListener('click', registrarEEnviarItem);

        // Campo Código Produto
        codigoProdutoInput.addEventListener('blur', buscarDadosProdutoAutomaticamente);
        codigoProdutoInput.addEventListener('input', () => { nomeProdutoDisplayDiv.textContent = ''; }); // Limpa nome ao digitar
        codigoProdutoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) { console.log("Enter/Ir no Código"); e.preventDefault(); pesoTaraKgInput.focus(); pesoTaraKgInput.select(); } });

        // Campo Tara
        pesoTaraKgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) { console.log("Enter/Ir na Tara"); e.preventDefault(); pesoTotalKgInput.focus(); pesoTotalKgInput.select(); } });
        pesoTaraKgInput.addEventListener('input', () => { console.log("Input manual na Tara."); desmarcarBotoesTara(); letraPoteSelecionada = 'Manual'; letraPoteSelecionadoSpan.textContent = `(Manual)`; });

        // Campo Peso Total
        pesoTotalKgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) { console.log("Enter/Ir no Peso Total"); e.preventDefault(); registrarItemBtn.click(); } });

        // Botões de Tara Rápida
        botoesTaraContainer.addEventListener('click', e => {
            const btn = e.target.closest('.tara-button'); if (!btn) return;
            console.log(`Botão Tara '${btn.dataset.letra}' clicado.`);
            const tara = parseFloat(btn.dataset.taraKg);
            letraPoteSelecionada = btn.dataset.letra || 'N/A';
            letraPoteSelecionadoSpan.textContent = `(${letraPoteSelecionada})`;
            if (!isNaN(tara)) {
                 pesoTaraKgInput.value = tara > 0 ? tara.toFixed(3) : '';
                 desmarcarBotoesTara(); btn.classList.add('selected');
                 console.log(`Campo Tara definido para: '${pesoTaraKgInput.value || '0'}'`);
                 pesoTotalKgInput.focus(); pesoTotalKgInput.select();
            }
        });

        // Botões da sessão local e nome
        limparSessaoLocalBtn.addEventListener('click', () => { if (itensLocais.length === 0) { alert("Nenhum registro local."); return; } if (confirm('Limpar registros locais?')) { itensLocais = []; localStorage.removeItem(ITENS_KEY_LOCAL); renderizarListaItensLocais(); } });
        listaItensBody.addEventListener('click', e => { const btn = e.target.closest('button[data-action="delete-local"]'); if (!btn) return; const idx = parseInt(btn.dataset.index, 10); if (!isNaN(idx)) { excluirItemLocal(idx); } });
        alterarNomeBtn.addEventListener('click', () => { inputNomeUsuario.value = nomeUsuario; overlayNomeUsuario.style.display = 'block'; modalNomeUsuario.style.display = 'block'; inputNomeUsuario.focus(); });
        salvarNomeUsuarioBtn.addEventListener('click', () => salvarNomeUsuario(inputNomeUsuario.value));
        inputNomeUsuario.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.keyCode === 13) { event.preventDefault(); salvarNomeUsuario(inputNomeUsuario.value); } });
        nomeUsuarioDisplay.addEventListener('click', () => { inputNomeUsuario.value = nomeUsuario; overlayNomeUsuario.style.display = 'block'; modalNomeUsuario.style.display = 'block'; inputNomeUsuario.focus(); });

        console.log("Event listeners adicionados com sucesso.");
    } catch (error) {
         console.error("ERRO CRÍTICO ao adicionar event listeners:", error);
         alert("Erro fatal ao configurar interações do aplicativo. Verifique o console (F12).");
         if(registrarItemBtn) registrarItemBtn.disabled = true; // Garante desabilitado se der erro aqui
    }

    /* ---------- Inicialização ---------- */
    await carregarMapaProdutos(); // Espera o JSON carregar
    pedirNomeUsuario();           // Pede nome (e ajusta botão)
    carregarItensLocais();        // Carrega backup local
    console.log("App inicializado e pronto.");

} // Fim da função main assíncrona

// Chama a função principal quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', main);

// Funções auxiliares que precisam estar no escopo global ou serem passadas
// (Colocadas aqui para simplificar, mas poderiam estar dentro de `main` se não fossem chamadas por listeners definidos fora dela - o que não é o caso aqui)

function parsePtBrDate(str) {
     if (!str || typeof str !== 'string') return new Date(0);
     const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);
     if (m && m.length === 7) { return new Date(Date.UTC(m[3], m[2] - 1, m[1], m[4], m[5], m[6])); }
     const d = Date.parse(str.replace(',', '')); return isNaN(d) ? new Date(0) : new Date(d);
};

function desmarcarBotoesTara() {
    const container = document.getElementById('botoesTaraContainer');
    const spanLetra = document.getElementById('letraPoteSelecionado');
    if (container) {
        container.querySelectorAll('.tara-button').forEach(b => b.classList.remove('selected'));
    }
    if(spanLetra) {
        spanLetra.textContent = '';
    }
    // Nota: A variável global letraPoteSelecionada será resetada dentro das funções que chamam desmarcarBotoesTara se necessário.
};

// As outras funções (salvarNomeUsuario, pedirNomeUsuario, etc.) são definidas dentro do escopo de `main`
// e adicionadas como listeners lá, então não precisam estar no escopo global.
