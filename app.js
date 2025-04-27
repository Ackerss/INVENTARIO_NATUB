// v13 – Estrutura revisada para estabilidade e logs extras

/* ------------------------------------------------------------------ */
/*  ATENÇÃO: coloque aqui o URL público do seu Apps Script            */
/* ------------------------------------------------------------------ */
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz9_BwTH7ddUY7I9Am7MOwvAXz6Lj4KQRPrnKZhzzfxmF3fDozm5DDDAjNXH7VrEhmdnw/exec';

/* ------------------------------------------------------------------ */
/*  Todo o restante do código permanece igual                         */
/* ------------------------------------------------------------------ */

/*  >>> O conteúdo completo do seu app.js original (v13) vai abaixo  */
/*  (sem nenhuma alteração além da constante acima)                  */

window.addEventListener('error', function(event) {
    console.error('ERRO GLOBAL NÃO CAPTURADO:', event.message, 'em', event.filename, 'linha', event.lineno);
    alert(`Ocorreu um erro inesperado no aplicativo:\n${event.message}\n\nPor favor, recarregue a página ou verifique o console.`);
});

async function mainApp() {
    console.log('Iniciando mainApp() v13 (Stable)...');

    if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_PUBLICADO') {
        alert("ATENÇÃO DESENVOLVEDOR: Cole o URL do seu Google Apps Script publicado na variável GOOGLE_SCRIPT_URL no arquivo app.js!");
        console.error("URL do Google Apps Script não configurada em app.js");
        const btn = document.getElementById('registrarItemBtn');
        if(btn) btn.disabled = true;
        return;
    }

    /* ---------- refs DOM ---------- */
    const el = id => document.getElementById(id);
    let codigoProdutoInput, nomeProdutoDisplayDiv, pesoTotalKgInput, pesoTaraKgInput,
        registrarItemBtn, listaItensBody, botoesTaraContainer, statusEnvioDiv,
        nomeUsuarioDisplay, overlayNomeUsuario, modalNomeUsuario, inputNomeUsuario,
        salvarNomeUsuarioBtn, limparSessaoLocalBtn, alterarNomeBtn, letraPoteSelecionadoSpan;

    try {
        codigoProdutoInput = el('codigoProduto');
        nomeProdutoDisplayDiv = el('nomeProdutoDisplay');
        pesoTotalKgInput = el('pesoTotalKg');
        pesoTaraKgInput = el('pesoTaraKg');
        registrarItemBtn = el('registrarItemBtn');
        listaItensBody = el('listaItensBody');
        botoesTaraContainer = el('botoesTaraContainer');
        statusEnvioDiv = el('statusEnvio');
        nomeUsuarioDisplay = el('nomeUsuarioDisplay');
        overlayNomeUsuario = el('overlayNomeUsuario');
        modalNomeUsuario = el('modalNomeUsuario');
        inputNomeUsuario = el('inputNomeUsuario');
        salvarNomeUsuarioBtn = el('salvarNomeUsuarioBtn');
        limparSessaoLocalBtn = el('limparSessaoLocalBtn');
        alterarNomeBtn = el('alterarNomeBtn');
        letraPoteSelecionadoSpan = el('letraPoteSelecionado');

        const refs = { codigoProdutoInput, nomeProdutoDisplayDiv, pesoTotalKgInput, pesoTaraKgInput, registrarItemBtn, listaItensBody, botoesTaraContainer, statusEnvioDiv, nomeUsuarioDisplay, overlayNomeUsuario, modalNomeUsuario, inputNomeUsuario, salvarNomeUsuarioBtn, limparSessaoLocalBtn, alterarNomeBtn, letraPoteSelecionadoSpan };
        for (const key in refs) {
            if (!refs[key]) throw new Error(`Elemento do DOM não encontrado: ${key}`);
        }
        console.log('Elementos do DOM referenciados.');
    } catch (error) {
        console.error("ERRO CRÍTICO ao referenciar elementos:", error);
        alert(`Erro ao carregar a interface: ${error.message}`);
        return;
    }

    /* ---------- storage ---------- */
    const ITENS_KEY_LOCAL = 'inventarioGranelItens_vLocal';
    const NOME_USUARIO_KEY = 'inventarioGranelUsuario';
    let itensLocais = [];
    let nomeUsuario = '';

    /* ---------- Estado ---------- */
    let letraPoteSelecionada = 'Nenhuma';
    let enviandoDados = false;
    const MAPA_PRODUTOS  = {};

    /* ---------- Carrega potes.json ---------- */
    async function carregarMapaProdutos() {
        try {
            console.log('Carregando potes.json...');
            const resp = await fetch('potes.json', { cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${resp.statusText}`);
            const arr = await resp.json();
            arr.forEach(p => {
                const codigo = String(p.codigo).trim();
                const tara = parseFloat(p.tara);
                MAPA_PRODUTOS[codigo] = { nome: p.Nome || 'N/A', tara, letra: p.letra || 'N/A' };
            });
            console.log('potes.json carregado:', Object.keys(MAPA_PRODUTOS).length, 'códigos');
        } catch (e) {
            console.error('Erro potes.json:', e);
            alert('Falha ao carregar potes.json; busca automática indisponível.');
        }
    }

    /* ---------- util ---------- */
    const desmarcarBotoesTara = () => {
        botoesTaraContainer.querySelectorAll('.tara-button.selected')
            .forEach(btn => btn.classList.remove('selected'));
    };

    function atualizarEstadoBotaoRegistrar() {
        const habilitar = !!nomeUsuario && !enviandoDados;
        registrarItemBtn.disabled = !habilitar;
    }

    /* ---------- Nome usuário ---------- */
    function salvarNomeUsuario(nome) {
        nome = nome.trim();
        if (!nome) { alert('Digite um nome válido'); return; }
        localStorage.setItem(NOME_USUARIO_KEY, nome);
        nomeUsuario = nome;
        nomeUsuarioDisplay.textContent = `Olá, ${nome}!`;
        modalNomeUsuario.style.display = 'none';
        overlayNomeUsuario.style.display = 'none';
        atualizarEstadoBotaoRegistrar();
    }

    function pedirNomeUsuario() {
        nomeUsuario = localStorage.getItem(NOME_USUARIO_KEY) || '';
        if (!nomeUsuario) {
            overlayNomeUsuario.style.display = 'block';
            modalNomeUsuario.style.display = 'block';
            inputNomeUsuario.focus();
        } else {
            nomeUsuarioDisplay.textContent = `Olá, ${nomeUsuario}!`;
        }
        atualizarEstadoBotaoRegistrar();
    }

    /* ---------- Persistência local ---------- */
    const salvarItensLocais = () =>
        localStorage.setItem(ITENS_KEY_LOCAL, JSON.stringify(itensLocais));

    const carregarItensLocais = () => {
        try {
            itensLocais = JSON.parse(localStorage.getItem(ITENS_KEY_LOCAL)) || [];
        } catch { itensLocais = []; }
        renderizarListaItensLocais();
    };

    function renderizarListaItensLocais() {
        listaItensBody.innerHTML = '';
        if (!itensLocais.length) {
            listaItensBody.innerHTML =
              '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item local.</td></tr>';
            return;
        }
        itensLocais.forEach((it, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${it.codigo}</td>
              <td>${it.pesoLiquido.toFixed(3)}</td>
              <td>${it.tara.toFixed(3)}</td>
              <td>${new Date(it.datetime).toLocaleString()}</td>
              <td>
                  <button class="action-button text-red-600" data-del="${i}">
                      <i class="fas fa-trash"></i>
                  </button>
              </td>`;
            listaItensBody.appendChild(tr);
        });
    }

    function excluirItemLocal(index) {
        itensLocais.splice(index, 1);
        salvarItensLocais();
        renderizarListaItensLocais();
    }

    /* ---------- Busca automática tara/nome ---------- */
    function buscarDadosProdutoAutomaticamente() {
        const codigo = codigoProdutoInput.value.trim();
        if (MAPA_PRODUTOS[codigo]) {
            const { nome, tara, letra } = MAPA_PRODUTOS[codigo];
            nomeProdutoDisplayDiv.textContent = nome;
            if (!pesoTaraKgInput.value) pesoTaraKgInput.value = tara.toFixed(3);
            desmarcarBotoesTara();
            const btn = botoesTaraContainer.querySelector(`[data-letra="${letra}"]`);
            if (btn) btn.classList.add('selected');
            letraPoteSelecionadoSpan.textContent = `(${letra})`;
        } else {
            nomeProdutoDisplayDiv.textContent = '';
        }
    }

    /* ---------- Enviar ---------- */
    async function registrarEEnviarItem() {
        if (enviandoDados) return;
        if (!nomeUsuario) { pedirNomeUsuario(); return; }

        const codigo = codigoProdutoInput.value.trim();
        const pesoTotal = parseFloat(pesoTotalKgInput.value.replace(',', '.'));
        const tara = parseFloat(pesoTaraKgInput.value.replace(',', '.')) || 0;

        if (!codigo || isNaN(pesoTotal)) {
            alert('Preencha código e peso total.');
            return;
        }
        const pesoLiquido = pesoTotal - tara;
        if (pesoLiquido <= 0) {
            alert('Peso líquido <= 0; verifique tara e peso total.');
            return;
        }

        const dados = {
            usuario: nomeUsuario,
            codigo,
            nomeProduto: MAPA_PRODUTOS[codigo]?.nome || '',
            pesoLiquido,
            tara,
            pesoTotal,
            letraPote: letraPoteSelecionada
        };

        enviandoDados = true;
        atualizarEstadoBotaoRegistrar();
        statusEnvioDiv.textContent = 'Enviando...';
        statusEnvioDiv.className = 'sending';

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const respText = await response.text();
            const respJson = JSON.parse(respText || '{}');

            if (!response.ok || respJson.result !== 'success') {
                throw new Error(respJson.message || `HTTP ${response.status}`);
            }

            statusEnvioDiv.textContent = 'Enviado com sucesso!';
            statusEnvioDiv.className = 'success flash-success';

            itensLocais.push({ ...dados, datetime: Date.now() });
            salvarItensLocais();
            renderizarListaItensLocais();

            codigoProdutoInput.value = '';
            pesoTaraKgInput.value = '';
            pesoTotalKgInput.value = '';
            nomeProdutoDisplayDiv.textContent = '';
            desmarcarBotoesTara();
            letraPoteSelecionada = 'Nenhuma';
            letraPoteSelecionadoSpan.textContent = '';
            codigoProdutoInput.focus();

        } catch (err) {
            console.error('Falha no envio:', err);
            statusEnvioDiv.textContent = `Erro: ${err.message}`;
            statusEnvioDiv.className = 'error flash-error';
        } finally {
            enviandoDados = false;
            atualizarEstadoBotaoRegistrar();
            setTimeout(() => statusEnvioDiv.textContent = '', 7000);
        }
    }

    /* ---------- Listeners ---------- */
    registrarItemBtn.addEventListener('click', registrarEEnviarItem);
    codigoProdutoInput.addEventListener('blur', buscarDadosProdutoAutomaticamente);
    codigoProdutoInput.addEventListener('input', () => nomeProdutoDisplayDiv.textContent = '');
    codigoProdutoInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); pesoTaraKgInput.focus(); }
    });
    pesoTaraKgInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); pesoTotalKgInput.focus(); }
    });
    pesoTotalKgInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); registrarItemBtn.click(); }
    });

    botoesTaraContainer.addEventListener('click', e => {
        const btn = e.target.closest('.tara-button');
        if (!btn) return;
        desmarcarBotoesTara();
        btn.classList.add('selected');
        pesoTaraKgInput.value = parseFloat(btn.dataset.taraKg).toFixed(3);
        letraPoteSelecionada = btn.dataset.letra || 'N/A';
        letraPoteSelecionadoSpan.textContent = `(${letraPoteSelecionada})`;
        pesoTotalKgInput.focus();
    });

    pesoTaraKgInput.addEventListener('input', () => {
        desmarcarBotoesTara();
        letraPoteSelecionada = 'Manual';
        letraPoteSelecionadoSpan.textContent = '(Manual)';
    });

    limparSessaoLocalBtn.addEventListener('click', () => {
        if (confirm('Limpar todos os registros locais?')) {
            itensLocais = [];
            salvarItensLocais();
            renderizarListaItensLocais();
        }
    });

    listaItensBody.addEventListener('click', e => {
        const idx = e.target.closest('[data-del]')?.dataset.del;
        if (idx !== undefined) excluirItemLocal(Number(idx));
    });

    alterarNomeBtn.addEventListener('click', () => pedirNomeUsuario());
    salvarNomeUsuarioBtn.addEventListener('click', () => salvarNomeUsuario(inputNomeUsuario.value));
    inputNomeUsuario.addEventListener('keydown', e => {
        if (e.key === 'Enter') salvarNomeUsuario(inputNomeUsuario.value);
    });
    nomeUsuarioDisplay.addEventListener('click', () => pedirNomeUsuario());

    /* ---------- Inicialização ---------- */
    await carregarMapaProdutos();
    pedirNomeUsuario();
    carregarItensLocais();
    console.log('App pronto.');
}

document.addEventListener('DOMContentLoaded', mainApp);
