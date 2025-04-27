<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#4A90E2">
    <title>Contador de Inventário Granel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="manifest" href="manifest.json">
    <style>
        /* Estilos gerais e de botões */
        @keyframes flash { 0%,100%{background-color:initial;} 50%{background-color:#a7f3d0;} }
        .flash-success{animation:flash .5s ease-out;}
        @keyframes flash-error { 0%,100%{background-color:initial;} 50%{background-color:#fecaca;} }
        .flash-error{animation:flash-error .7s ease-out;}
        #listaItensTable{width:100%;table-layout:fixed;word-wrap:break-word;font-size:.9rem}
        #listaItensTable th,#listaItensTable td{padding:6px 4px;text-align:left;border:1px solid #e5e7eb;overflow-wrap:break-word;vertical-align:middle}
        .action-button{padding:4px 8px;font-size:.8rem;margin-right:2px;display:inline-flex;align-items:center;justify-content:center}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        #installPwaButton{display:none}
        .tara-button{padding:.5rem .75rem;font-size:.875rem;font-weight:600;border:1px solid #6b7280;border-radius:.375rem;background:#f3f4f6;color:#374151;transition:background-color .2s;margin:.25rem;min-width:40px;text-align:center;cursor:pointer}
        .tara-button:hover{background:#e5e7eb}
        .tara-button.selected{background:#3b82f6;color:#fff;border-color:#2563eb}
        #statusEnvio {text-align:center;padding:0.5rem;margin-top:0.5rem;border-radius:0.375rem;font-weight:500;display:none;}
        #statusEnvio.success { background-color:#d1fae5;color:#065f46;display:block; }
        #statusEnvio.error { background-color:#fee2e2;color:#991b1b;display:block; }
        #statusEnvio.sending { background-color:#e0e7ff;color:#3730a3;display:block; }
        #overlayNomeUsuario { position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.6);z-index:40;display:none; }
        #modalNomeUsuario { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:white;padding:2rem;border-radius:0.5rem;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:50;min-width:300px;text-align:center;display:none;}
        #nomeProdutoDisplay {min-height: 1.25rem;font-size: 0.875rem;color: #1e40af;margin-top: 0.25rem;margin-bottom: 0.5rem;padding-left: 0.5rem;padding-right: 0.5rem;text-align: left;font-style: italic;font-weight: 500;line-height: 1.25rem;}
    </style>
</head>
<body class="bg-gray-100 font-sans p-2 sm:p-4">

    <div id="overlayNomeUsuario"></div>
    <div id="modalNomeUsuario">
        <h2 class="text-lg font-semibold mb-4">Identificação</h2>
        <p class="mb-4 text-sm text-gray-600">Por favor, digite seu nome para registrar as contagens:</p>
        <input type="text" id="inputNomeUsuario" class="w-full p-2 border border-gray-300 rounded-md mb-4" placeholder="Seu nome">
        <button id="salvarNomeUsuarioBtn" class="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Salvar e Continuar</button>
    </div>

    <div class="container mx-auto max-w-2xl bg-white p-4 sm:p-6 rounded-lg shadow-md">

        <div class="flex justify-between items-center mb-4">
            <h1 class="text-xl sm:text-2xl font-bold text-center text-gray-700 flex-grow">Contador de Inventário Granel</h1>
            <span id="nomeUsuarioDisplay" class="text-sm text-blue-600 font-medium cursor-pointer ml-2 whitespace-nowrap" title="Clique para alterar seu nome"></span>
        </div>

        <div class="text-center mb-4">
            <button id="installPwaButton" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center">
                <i class="fas fa-download mr-2"></i>Instalar App
            </button>
        </div>

        <div class="mb-6 space-y-4">
            <div>
                <label for="codigoProduto" class="block text-sm font-medium text-gray-700 mb-1">Código do Produto:</label>
                <input type="text" id="codigoProduto" class="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Digite ou leia o código">
                 <div id="nomeProdutoDisplay"></div>
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Selecionar Tara Rápida (Pote): <span id="letraPoteSelecionado" class="font-bold"></span></label>
                <div id="botoesTaraContainer" class="flex flex-wrap justify-center">
                    <button class="tara-button" data-tara-kg="0.258" data-letra="A">A</button>
                    <button class="tara-button" data-tara-kg="0.410" data-letra="B">B</button>
                    <button class="tara-button" data-tara-kg="0.322" data-letra="C">C</button>
                    <button class="tara-button" data-tara-kg="0.586" data-letra="D">D</button>
                    <button class="tara-button" data-tara-kg="0.750" data-letra="E">E</button>
                    <button class="tara-button" data-tara-kg="0" data-letra="Nenhuma">Nenhuma</button>
                </div>
            </div>

            <div>
                <label for="pesoTaraKg" class="block text-sm font-medium text-gray-700 mb-1">Peso do Pote/Tara (kg):</label>
                <input type="number" id="pesoTaraKg" inputmode="decimal" step="0.001" class="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Selecione acima ou digite (0 se não houver)">
            </div>

            <div>
                <label for="pesoTotalKg" class="block text-sm font-medium text-gray-700 mb-1">Peso Total na Balança (kg):</label>
                <input type="number" id="pesoTotalKg" inputmode="decimal" step="0.001" class="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 1.570">
            </div>

             <div id="statusEnvio"></div>

            <button id="registrarItemBtn" class="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 sm:py-3 px-4 rounded-md text-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                <i class="fas fa-cloud-upload-alt mr-2"></i>Registrar e Enviar
            </button>
        </div>

        <div class="mb-6 opacity-60" title="Registros locais desta sessão (não afetam a planilha)">
            <h2 class="text-base sm:text-lg font-semibold text-gray-600 mb-2">Registros Locais (Temporário):</h2>
            <div class="overflow-x-auto bg-white rounded-md shadow max-h-40 overflow-y-auto border border-gray-200">
                <table id="listaItensTable" class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="width: 25%;">Código</th>
                        <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="width: 20%;">Peso Líq. (kg)</th>
                        <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="width: 15%;">Tara (kg)</th>
                        <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="width: 25%;">Data/Hora</th>
                        <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style="width: 15%;">Ações</th>
                    </tr>
                    </thead>
                    <tbody id="listaItensBody" class="bg-white divide-y divide-gray-200">
                    <tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item local.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mb-6">
            <button id="limparSessaoLocalBtn" class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                <i class="fas fa-history mr-2"></i> Limpar Registros Locais
            </button>
             <button id="alterarNomeBtn" class="flex-1 bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                <i class="fas fa-user-edit mr-2"></i> Alterar Nome
            </button>
        </div>

    </div> <script src="app.js"></script>
    <script>
        // Script PWA (sem alterações)
        if ('serviceWorker' in navigator) { /* ... */ }
        let deferredPrompt; const installBtn = document.getElementById('installPwaButton');
        window.addEventListener('beforeinstallprompt', e => { /* ... */ });
        installBtn.addEventListener('click', () => { /* ... */ });
        window.addEventListener('appinstalled', () => installBtn.style.display='none');
    </script>

</body>
</html>
