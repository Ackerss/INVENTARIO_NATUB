// v13 - Estrutura revisada para estabilidade e logs

// Adiciona um listener de erro global para pegar erros não capturados
window.addEventListener('error', function(event) {
    console.error('ERRO GLOBAL NÃO CAPTURADO:', event.message, 'em', event.filename, 'linha', event.lineno);
    alert(`Ocorreu um erro inesperado no aplicativo:\n${event.message}\n\nPor favor, recarregue a página ou verifique o console.`);
});

// Função principal assíncrona para garantir a ordem de carregamento
async function mainApp() {
    console.log('Iniciando mainApp() v13 (Stable)...');

    // --- URL DO SEU SCRIPT PUBLICADO ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9_BwTH7ddUY7I9Am7MOwvAXz6Lj4KQRPrnKZhzzfxmF3fDozm5DDDAjNXH7VrEhmdnw/exec'; // SEU URL

    if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_PUBLICADO') {
        alert("ATENÇÃO DESENVOLVEDOR: Cole o URL do seu Google Apps Script publicado na variável GOOGLE_SCRIPT_URL no arquivo app.js!");
        console.error("URL do Google Apps Script não configurada em app.js");
        // Desabilita o botão de envio se URL não estiver configurado
        const btn = document.getElementById('registrarItemBtn');
        if(btn) btn.disabled = true;
        return; // Impede o resto da inicialização
    }

    /* ---------- refs DOM ---------- */
    const el = id => document.getElementById(id);
    let codigoProdutoInput, nomeProdutoDisplayDiv, pesoTotalKgInput, pesoTaraKgInput, registrarItemBtn, listaItensBody, botoesTaraContainer, statusEnvioDiv, nomeUsuarioDisplay, overlayNomeUsuario, modalNomeUsuario, inputNomeUsuario, salvarNomeUsuarioBtn, limparSessaoLocalBtn, alterarNomeBtn, letraPoteSelecionadoSpan;

    // Tenta obter todas as referências e para se alguma falhar
    try {
        codigoProdutoInput = el('codigoProduto'); nomeProdutoDisplayDiv = el('nomeProdutoDisplay');
        pesoTotalKgInput   = el('pesoTotalKg'); pesoTaraKgInput = el('pesoTaraKg');
        registrarItemBtn   = el('registrarItemBtn'); listaItensBody = el('listaItensBody');
        botoesTaraContainer= el('botoesTaraContainer'); statusEnvioDiv = el('statusEnvio');
        nomeUsuarioDisplay = el('nomeUsuarioDisplay'); overlayNomeUsuario = el('overlayNomeUsuario');
        modalNomeUsuario   = el('modalNomeUsuario'); inputNomeUsuario = el('inputNomeUsuario');
        salvarNomeUsuarioBtn= el('salvarNomeUsuarioBtn'); limparSessaoLocalBtn = el('limparSessaoLocalBtn');
        alterarNomeBtn     = el('alterarNomeBtn'); letraPoteSelecionadoSpan = el('letraPoteSelecionado');

        const refs = { codigoProdutoInput, nomeProdutoDisplayDiv, pesoTotalKgInput, pesoTaraKgInput, registrarItemBtn, listaItensBody, botoesTaraContainer, statusEnvioDiv, nomeUsuarioDisplay, overlayNomeUsuario, modalNomeUsuario, inputNomeUsuario, salvarNomeUsuarioBtn, limparSessaoLocalBtn, alterarNomeBtn, letraPoteSelecionadoSpan };
        for (const key in refs) {
            if (!refs[key]) { throw new Error(`Elemento do DOM não encontrado: ${key}`); }
        }
        console.log('Elementos do DOM referenciados com sucesso.');
    } catch (error) {
         console.error("ERRO CRÍTICO ao referenciar elementos do DOM:", error);
         alert(`Erro fatal ao carregar a interface: ${error.message}. O aplicativo não pode continuar.`);
         return; // Interrompe a execução
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
        const habilitar = !!nomeUsuario && !enviandoDados;
        if (registrarItemBtn) { // Verifica se o botão existe antes de acessá-lo
             registrarItemBtn.disabled = !habilitar;
             console.log(`[atualizarEstadoBotaoRegistrar] Nome: ${nomeUsuario ? 'OK' : 'Falta'}, Enviando: ${enviandoDados}. Botão ${habilitar ? 'HABILITADO' : 'DESABILITADO'}.`);
        } else {
             console.error("[atualizarEstadoBotaoRegistrar] Botão registrarItemBtn não encontrado!");
        }
    }

    /* ---------- Gerenciamento Nome Usuário ---------- */
    function salvarNomeUsuario(nome) {
        nome = nome.trim();
        if (nome) {
            localStorage.setItem(NOME_USUARIO_KEY, nome);
            nomeUsuario = nome;
            if(nomeUsuarioDisplay) nomeUsuarioDisplay.textContent = `Olá, ${nome}!`;
            if(nomeUsuarioDisplay) nomeUsuarioDisplay.title = "Clique para alterar seu nome";
            if(modalNomeUsuario) modalNomeUsuario.style.display = 'none';
            if(overlayNomeUsuario) overlayNomeUsuario.style.display = 'none';
            console.log("Nome do usuário salvo:", nome);
        } else {
            alert("Por favor, digite um nome válido.");
        }
        atualizarEstadoBotaoRegistrar(); // Atualiza estado do botão independentemente
    }

    function pedirNomeUsuario() {
        try {
            nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
            if (!nomeUsuario) {
                console.log("Nenhum nome de usuário salvo, solicitando...");
                if(overlayNomeUsuario) overlayNomeUsuario.style.display = 'block';
                if(modalNomeUsuario) modalNomeUsuario.style.display = 'block';
                if(inputNomeUsuario) inputNomeUsuario.focus();
            } else {
                console.log("Nome do usuário carregado:", nomeUsuario);
                if(nomeUsuarioDisplay) nomeUsuarioDisplay.textContent = `Olá, ${nomeUsuario}!`;
                if(nomeUsuarioDisplay) nomeUsuarioDisplay.title = "Clique para alterar seu nome";
            }
        } catch (error) {
            console.error("Erro ao pedir nome de usuário:", error);
        } finally {
            // Garante que o estado do botão seja atualizado
            atualizarEstadoBotaoRegistrar();
        }
    }

    /* ---------- Persistência e Interface Local (Opcional) ---------- */
    const salvarItensLocais = () => { /* ... */ };
    const carregarItensLocais = () => { /* ... */ };
    function renderizarListaItensLocais() { /* ... */ }
    function excluirItemLocal(index) { /* ... */ }

    /* ---------- Buscar Tara e Nome Automáticos ---------- */
    function buscarDadosProdutoAutomaticamente() { /* ... (igual v11) ... */ }

    /* ---------- Registrar e Enviar para Google Sheets ---------- */
    async function registrarEEnviarItem() { /* ... (igual v11, mas chama atualizarEstadoBotaoRegistrar no finally) ... */
        if (enviandoDados) { console.warn("Envio já em progresso."); return; }
        if (!nomeUsuario) { alert("Defina seu nome de usuário."); pedirNomeUsuario(); return; }
        if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_PUBLICADO') { alert("Erro: URL do Script não configurada."); return; }

        console.log("Iniciando registrarEEnviarItem...");
        enviandoDados = true; // Define flag ANTES de desabilitar
        atualizarEstadoBotaoRegistrar(); // Desabilita botão via flag
        statusEnvioDiv.textContent = 'Enviando...'; statusEnvioDiv.className = 'sending';
        let nomeProdutoEncontrado = "N/A";

        try {
            /* ... (Lógica de validação e preparação dos dados) ... */
            const codigo = codigoProdutoInput.value.trim(); /*...*/
            const pesoTotalKg = /*...*/; let taraKg = /*...*/; const pesoLiquidoKg = /*...*/;
            if (MAPA_PRODUTOS[codigo]) { nomeProdutoEncontrado = MAPA_PRODUTOS[codigo].nome || "N/A"; }
            else { nomeProdutoEncontrado = "(Código não encontrado)"; }
            const dadosParaEnviar = { /* ... */ };

            console.log("Dados a serem enviados:", JSON.stringify(dadosParaEnviar));
            console.log("Enviando fetch para:", GOOGLE_SCRIPT_URL);
            const response = await fetch(GOOGLE_SCRIPT_URL, { /* ... Opções Fetch ... */ });
            /* ... (Tratamento da Resposta) ... */
            const responseText = await response.text(); /*...*/ let responseData = {}; /*...*/
            if (!response.ok || responseData.result !== 'success') { throw new Error(/*...*/); }

            // --- Sucesso ---
            console.log("Dados enviados com sucesso!");
            statusEnvioDiv.textContent = 'Enviado com sucesso!'; statusEnvioDiv.className = 'success flash-success';
            /* ... (Adiciona log local, Limpa formulário) ... */
            pesoTotalKgInput.value = ''; codigoProdutoInput.value = ''; pesoTaraKgInput.value = ''; nomeProdutoDisplayDiv.textContent = '';
            desmarcarBotoesTara(); codigoProdutoInput.focus();

        } catch (error) {
            /* ... (Tratamento de erro) ... */
             console.error("Falha ao enviar dados:", error);
             statusEnvioDiv.textContent = `Erro ao enviar: ${error.message}`; statusEnvioDiv.className = 'error flash-error';
             alert(`Falha ao enviar: ${error.message}`);
        } finally {
            enviandoDados = false; // Reseta flag
            atualizarEstadoBotaoRegistrar(); // Reabilita/Desabilita botão corretamente
            console.log("registrarEEnviarItem finalizado.");
            setTimeout(() => { statusEnvioDiv.textContent = ''; statusEnvioDiv.style.display = 'none'; }, 7000);
        }
    }

    /* ---------- Eventos ---------- */
    // Adiciona listeners DENTRO de um try...catch para pegar erros na adição
    try {
        console.log("Adicionando event listeners...");

        registrarItemBtn.addEventListener('click', registrarEEnviarItem);
        codigoProdutoInput.addEventListener('blur', buscarDadosProdutoAutomaticamente);
        codigoProdutoInput.addEventListener('input', () => { if(nomeProdutoDisplayDiv) nomeProdutoDisplayDiv.textContent = ''; }); // Limpa nome ao digitar
        codigoProdutoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) { console.log("Enter/Ir no Código"); e.preventDefault(); pesoTaraKgInput?.focus(); pesoTaraKgInput?.select(); } });
        pesoTaraKgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) { console.log("Enter/Ir na Tara"); e.preventDefault(); pesoTotalKgInput?.focus(); pesoTotalKgInput?.select(); } });
        pesoTotalKgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) { console.log("Enter/Ir no Peso Total"); e.preventDefault(); registrarItemBtn?.click(); } });

        botoesTaraContainer.addEventListener('click', e => {
            const btn = e.target.closest('.tara-button'); if (!btn) return;
            console.log(`Botão Tara '${btn.dataset.letra}' clicado.`);
            const tara = parseFloat(btn.dataset.taraKg);
            letraPoteSelecionada = btn.dataset.letra || 'N/A';
            if(letraPoteSelecionadoSpan) letraPoteSelecionadoSpan.textContent = `(${letraPoteSelecionada})`;
            if (!isNaN(tara)) {
                 if(pesoTaraKgInput) pesoTaraKgInput.value = tara > 0 ? tara.toFixed(3) : '';
                 desmarcarBotoesTara(); btn.classList.add('selected');
                 console.log(`Campo Tara definido para: '${pesoTaraKgInput?.value || '0'}'`);
                 pesoTotalKgInput?.focus(); pesoTotalKgInput?.select();
            }
        });
        pesoTaraKgInput.addEventListener('input', () => { console.log("Input manual na Tara."); desmarcarBotoesTara(); letraPoteSelecionada = 'Manual'; if(letraPoteSelecionadoSpan) letraPoteSelecionadoSpan.textContent = `(Manual)`; });

        limparSessaoLocalBtn.addEventListener('click', () => { /* ... */ });
        listaItensBody.addEventListener('click', e => { /* ... */ });
        alterarNomeBtn.addEventListener('click', () => { /* ... */ });
        salvarNomeUsuarioBtn.addEventListener('click', () => salvarNomeUsuario(inputNomeUsuario.value));
        inputNomeUsuario.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.keyCode === 13) { event.preventDefault(); salvarNomeUsuario(inputNomeUsuario.value); } });
        nomeUsuarioDisplay.addEventListener('click', () => { /* ... */ });

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

} // Fim da função mainApp

// Chama a função principal apenas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', mainApp);
