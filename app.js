/* ========= CONFIG ========= */
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz9_BwTH7ddUY7I9Am7MOwvAXz6Lj4KQRPrnKZhzzfxmF3fDozm5DDDAjNXH7VrEhmdnw/exec';
const APP_VERSION = '27-abr-2025 r3';

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
  const r = await fetch('potes.json'); MAPA = Object.create(null);
  (await r.json()).forEach(p => MAPA[p.codigo]={nome:p.Nome,tara:p.tara,letra:p.letra});
}

/* ---------- NOME ---------- */
function pedeNome(){
  nomeUsuario = localStorage.getItem('inv_nome')||'';
  if(!nomeUsuario){overlay.classList.remove('hidden');modal.classList.remove('hidden');}
  nomeDisp.textContent = nomeUsuario?`Olá, ${nomeUsuario}!`:'';
  atualizaBotao();
}
function salvaNome(n){
  n=n.trim(); if(!n)return;
  localStorage.setItem('inv_nome',n); nomeUsuario=n;
  overlay.classList.add('hidden'); modal.classList.add('hidden');
  nomeDisp.textContent = `Olá, ${n}!`; atualizaBotao();
}

/* ---------- LOCAL ---------- */
function carregaLocais(){
  itens = JSON.parse(localStorage.getItem(ITENS_KEY)||'[]');
  itensEnviados = JSON.parse(localStorage.getItem(ITENS_ENVIADOS_KEY)||'[]');
  render();
  atualizaContadorItens();
}

function salvaLocais(){
  localStorage.setItem(ITENS_KEY, JSON.stringify(itens));
  localStorage.setItem(ITENS_ENVIADOS_KEY, JSON.stringify(itensEnviados));
  atualizaContadorItens();
}

function atualizaContadorItens() {
  // Atualiza texto do botão com contagem de itens
  enviarTodosBtn.textContent = `Enviar Todos os Dados (${itens.length})`;
  enviarTodosBtn.disabled = itens.length === 0 || enviando || !nomeUsuario;
}

function render(){
  tbody.innerHTML='';
  if(!itens.length){tbody.innerHTML='<tr><td colspan=5 class="text-center text-gray-500 py-4">Nenhum item local.</td></tr>';return;}
  itens.forEach((it,i)=>{
    tbody.insertAdjacentHTML('beforeend',
      `<tr>
        <td>${it.codigo}</td><td>${it.pLiq.toFixed(3)}</td><td>${it.tara.toFixed(3)}</td>
        <td>${new Date(it.dt).toLocaleString()}</td>
        <td><button data-i="${i}" class="text-red-600">X</button></td>
      </tr>`);
  });
}

/* ---------- UTIL ---------- */
function atualizaBotao(){
  btnReg.disabled=!nomeUsuario||enviando;
  enviarTodosBtn.disabled=!nomeUsuario||enviando||itens.length===0;
}
function resetForm(){
  codigoInp.value=''; taraInp.value=''; totalInp.value=''; nomeDiv.textContent='';
  letraPoteSel='Nenhuma'; spanLetra.textContent=''; desmarcaBotoes(); codigoInp.focus();
}
function desmarcaBotoes(){letras.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));}

/* ---------- ENVIO ---------- */
async function enviar() {
  if(enviando) return;
  if(!nomeUsuario) {pedeNome(); return;}

  const codigo = codigoInp.value.trim();
  const pesoTot = parseFloat(totalInp.value.replace(',','.'));
  const tara = parseFloat(taraInp.value.replace(',','.'))||0;
  
  if(!codigo || isNaN(pesoTot)) {
    alert('Preencha código e peso total');
    return;
  }

  const pesoLiq = pesoTot-tara;
  if(pesoLiq <= 0) {
    alert('Peso líquido <=0');
    return;
  }

  const payload = {
    usuario: nomeUsuario,
    codigo: codigo,
    nomeProduto: MAPA[codigo]?.nome || '',
    pesoLiquido: pesoLiq,
    tara: tara,
    pesoTotal: pesoTot,
    letraPote: letraPoteSel
  };

  enviando = true;
  atualizaBotao();
  status.textContent = 'Enviando…';
  status.className = 'sending';

  try {
    // Armazena localmente primeiro
    const novoItem = {
      codigo, 
      pLiq: pesoLiq, 
      tara, 
      dt: Date.now(),
      usuario: nomeUsuario,
      nomeProduto: MAPA[codigo]?.nome || '',
      pesoTotal: pesoTot,
      letraPote: letraPoteSel
    };
    
    itens.push(novoItem);
    salvaLocais();
    render();
    
    // Tenta enviar ao Google Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.result === 'success') {
      // Move o item para a lista de enviados
      itensEnviados.push(novoItem);
      itens.pop(); // Remove o último item (o que acabamos de enviar)
      salvaLocais();
      render();
      
      status.textContent = 'Enviado com sucesso!';
      status.className = 'success flash-success';
      resetForm();
    } else {
      throw new Error(data.message || 'Erro desconhecido no servidor');
    }
  } catch (e) {
    console.error('Falha no envio:', e);
    status.textContent = 'Erro ao enviar, mas salvo localmente!';
    status.className = 'error flash-error';
    // Não reseta o formulário em caso de erro
  } finally {
    enviando = false;
    atualizaBotao();
    setTimeout(() => status.textContent = '', 7000);
  }
}

/* ---------- ENVIAR TODOS ---------- */
async function enviarTodos() {
  if(enviando || !nomeUsuario || itens.length === 0) return;
  
  if(!confirm(`Enviar ${itens.length} itens para o servidor?`)) return;
  
  enviando = true;
  atualizaBotao();
  status.textContent = `Enviando 0/${itens.length}...`;
  status.className = 'sending';
  
  let sucesso = 0;
  let falhas = 0;
  
  for(let i = 0; i < itens.length; i++) {
    try {
      const item = itens[i];
      const payload = {
        usuario: nomeUsuario,
        codigo: item.codigo,
        nomeProduto: item.nomeProduto || MAPA[item.codigo]?.nome || '',
        pesoLiquido: item.pLiq,
        tara: item.tara,
        pesoTotal: item.pesoTotal || (item.pLiq + item.tara),
        letraPote: item.letraPote || 'Nenhuma'
      };
      
      status.textContent = `Enviando ${i+1}/${itens.length}...`;
      
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.result === 'success') {
        // Move o item para a lista de enviados
        itensEnviados.push(item);
        sucesso++;
      } else {
        throw new Error(data.message || 'Erro desconhecido no servidor');
      }
      
      // Pequena pausa para não sobrecarregar o servidor
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (e) {
      console.error('Erro ao enviar item:', e);
      falhas++;
    }
  }
  
  // Remover os itens enviados com sucesso
  if(sucesso > 0) {
    itens = itens.slice(sucesso);
    salvaLocais();
    render();
  }
  
  if(falhas === 0) {
    status.textContent = `Enviados ${sucesso} itens com sucesso!`;
    status.className = 'success flash-success';
  } else {
    status.textContent = `Enviados ${sucesso} itens, ${falhas} falhas.`;
    status.className = 'error flash-error';
  }
  
  enviando = false;
  atualizaBotao();
  setTimeout(() => status.textContent = '', 7000);
}

/* ---------- LISTENERS ---------- */
function addListeners(){
  btnReg.onclick=enviar;
  enviarTodosBtn.onclick=enviarTodos;

  // atalhos Enter
  codigoInp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();taraInp.focus();}});
  taraInp  .addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();totalInp.focus();}});
  totalInp .addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();btnReg.click();}});

  codigoInp.onblur=()=>{
    const d=MAPA[codigoInp.value.trim()]; if(!d)return;
    nomeDiv.textContent=d.nome;
    if(!taraInp.value)taraInp.value=d.tara.toFixed(3);
    desmarcaBotoes(); const b=letras.querySelector(`[data-letra="${d.letra}"]`); b&&b.classList.add('selected');
    letraPoteSel=d.letra; spanLetra.textContent=`(${d.letra})`;
  };

  letras.onclick=e=>{
    const b=e.target.closest('.tara-button'); if(!b)return;
    desmarcaBotoes(); b.classList.add('selected');
    taraInp.value=parseFloat(b.dataset.taraKg).toFixed(3);
    letraPoteSel=b.dataset.letra; spanLetra.textContent=`(${letraPoteSel})`;
    totalInp.focus();
  };

  taraInp.oninput=()=>{desmarcaBotoes();letraPoteSel='Manual';spanLetra.textContent='(Manual)';};

  document.getElementById('limparSessaoLocalBtn').onclick=()=>{
    if(confirm('Limpar registros locais?')){itens=[];salvaLocais();render();}
  };
  tbody.onclick=e=>{
    const i=e.target.dataset.i; if(i!==undefined){itens.splice(i,1);salvaLocais();render();}
  };
  document.getElementById('alterarNomeBtn').onclick=()=>{overlay.classList.remove('hidden');modal.classList.remove('hidden');inpNome.focus();};
  document.getElementById('salvarNomeUsuarioBtn').onclick=()=>salvaNome(inpNome.value);
  inpNome.addEventListener('keydown',e=>{if(e.key==='Enter')salvaNome(inpNome.value);});
}
