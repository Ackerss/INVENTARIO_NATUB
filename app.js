/* ========= CONFIG ========= */
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz9_BwTH7ddUY7I9Am7MOwvAXz6Lj4KQRPrnKZhzzfxmF3fDozm5DDDAjNXH7VrEhmdnw/exec';

/* ========= APP ========= */
const ITENS_KEY = 'inv_granel_itens';
let nomeUsuario = '', enviando = false, letraPoteSel = 'Nenhuma', itens = [], MAPA = {};

/* refs DOM */
const $ = id => document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'), totalInp=$('pesoTotalKg'),
      btnReg=$('registrarItemBtn'), tbody=$('listaItensBody'),
      letras=$('botoesTaraContainer'), status=$('statusEnvio'),
      nomeDisp=$('nomeUsuarioDisplay'), modal=$('modalNomeUsuario'),
      overlay=$('overlayNomeUsuario'), inpNome=$('inputNomeUsuario'),
      spanLetra=$('letraPoteSelecionado');

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  await carregaMapa(); carregaLocais(); pedeNome(); listeners();
});

/* ---------- MAPA PRODUTOS ---------- */
async function carregaMapa(){
  const r = await fetch('potes.json'); const arr = await r.json();
  arr.forEach(p=>MAPA[p.codigo]={nome:p.Nome,tara:p.tara,letra:p.letra});
}

/* ---------- NOME ---------- */
function pedeNome(){
  nomeUsuario = localStorage.getItem('inv_nome')||'';
  if(!nomeUsuario){overlay.classList.remove('hidden');modal.classList.remove('hidden');}
  nomeDisp.textContent = nomeUsuario?`Olá, ${nomeUsuario}!`:'';
  atualizaBtn();
}
function salvaNome(n){
  n=n.trim(); if(!n)return;
  localStorage.setItem('inv_nome',n); nomeUsuario=n;
  overlay.classList.add('hidden'); modal.classList.add('hidden');
  nomeDisp.textContent = `Olá, ${n}!`; atualizaBtn();
}

/* ---------- LOCAL ---------- */
function carregaLocais(){ itens = JSON.parse(localStorage.getItem(ITENS_KEY)||'[]'); render(); }
function salvaLocais(){ localStorage.setItem(ITENS_KEY,JSON.stringify(itens)); }
function render(){
  tbody.innerHTML='';
  if(!itens.length){tbody.innerHTML='<tr><td colspan=5 class="text-center text-gray-500 py-4">Nenhum item local.</td></tr>';return;}
  itens.forEach((it,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${it.codigo}</td><td>${it.pLiq.toFixed(3)}</td><td>${it.tara.toFixed(3)}</td><td>${new Date(it.dt).toLocaleString()}</td><td><button data-i="${i}" class="text-red-600">X</button></td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- UTIL ---------- */
function atualizaBtn(){btnReg.disabled = !nomeUsuario || enviando;}

function resetForm(){
  codigoInp.value=''; taraInp.value=''; totalInp.value=''; nomeDiv.textContent='';
  letraPoteSel='Nenhuma'; spanLetra.textContent=''; desmarcaBotoes();
  codigoInp.focus();
}
function desmarcaBotoes(){letras.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));}

/* ---------- ENVIO ---------- */
async function enviar(){
  if(enviando)return; if(!nomeUsuario){pedeNome();return;}
  const codigo=codigoInp.value.trim();
  const pesoTot=parseFloat(totalInp.value.replace(',','.'));
  const tara=parseFloat(taraInp.value.replace(',','.'))||0;
  if(!codigo||isNaN(pesoTot)){alert('Preencha código e peso total');return;}
  const pesoLiq=pesoTot-tara; if(pesoLiq<=0){alert('Peso líquido <=0');return;}

  const payload={
    usuario:nomeUsuario,codigo,nomeProduto:MAPA[codigo]?.nome||'',
    pesoLiquido:pesoLiq,tara,pesoTotal:pesoTot,letraPote:letraPoteSel
  };

  enviando=true; atualizaBtn();
  status.textContent='Enviando...'; status.className='sending';

  try{
    const r = await fetch(GOOGLE_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const j = await r.json(); if(!r.ok||j.result!=='success')throw new Error(j.message||'Erro desconhecido');
    status.textContent='Enviado com sucesso!'; status.className='success flash-success';
    itens.push({codigo,pLiq:pesoLiq,tara,dt:Date.now()}); salvaLocais(); render(); resetForm();
  }catch(e){
    status.textContent='Erro: '+e.message; status.className='error flash-error';
  }finally{
    enviando=false; atualizaBtn(); setTimeout(()=>status.textContent='',7000);
  }
}

/* ---------- LISTENERS ---------- */
function listeners(){
  btnReg.onclick=enviar;
  codigoInp.onblur=()=>{
    const d=MAPA[codigoInp.value.trim()]; if(!d)return;
    nomeDiv.textContent=d.nome; if(!taraInp.value)taraInp.value=d.tara.toFixed(3);
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
    const i=e.target.dataset.i; if(i===undefined)return;
    itens.splice(i,1); salvaLocais(); render();
  };
  document.getElementById('alterarNomeBtn').onclick=()=>{overlay.classList.remove('hidden');modal.classList.remove('hidden');inpNome.focus();};
  inpNome.onkeydown=e=>{if(e.key==='Enter')salvaNome(inpNome.value);};
  document.getElementById('salvarNomeUsuarioBtn').onclick=()=>salvaNome(inpNome.value);
}

/* versão para depuração */
console.log('App JS carregado – versão 27-abr-2025');
