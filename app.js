/* ========= CONFIG ========= */
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz9_BwTH7ddUY7I9Am7MOwvAXz6Lj4KQRPrnKZhzzfxmF3fDozm5DDDAjNXH7VrEhmdnw/exec';
const APP_VERSION = '27-abr-2025 r2';

/* ========= VARS ========= */
const ITENS_KEY = 'inv_granel_itens';
let nomeUsuario='', enviando=false, letraPoteSel='Nenhuma', itens=[], MAPA={};

/* ----- DOM ----- */
const $ = id=>document.getElementById(id);
const codigoInp=$('codigoProduto'), nomeDiv=$('nomeProdutoDisplay'),
      taraInp=$('pesoTaraKg'), totalInp=$('pesoTotalKg'),
      btnReg=$('registrarItemBtn'), tbody=$('listaItensBody'),
      letras=$('botoesTaraContainer'), status=$('statusEnvio'),
      nomeDisp=$('nomeUsuarioDisplay'), modal=$('modalNomeUsuario'),
      overlay=$('overlayNomeUsuario'), inpNome=$('inputNomeUsuario'),
      spanLetra=$('letraPoteSelecionado');

/* ----- INIT ----- */
document.addEventListener('DOMContentLoaded',async()=>{
  console.log('App',APP_VERSION);
  await fetch('potes.json').then(r=>r.json()).then(a=>a.forEach(p=>MAPA[p.codigo]={nome:p.Nome,tara:p.tara,letra:p.letra}));
  itens = JSON.parse(localStorage.getItem(ITENS_KEY)||'[]'); render();
  nomeUsuario = localStorage.getItem('inv_nome')||''; if(!nomeUsuario) pedirNome(); else nomeDisp.textContent=`Olá, ${nomeUsuario}!`;
  addListeners(); atualizaBtn();
});

/* ----- UTIL ----- */
function atualizaBtn(){btnReg.disabled=!nomeUsuario||enviando;}
function pedirNome(){overlay.classList.remove('hidden');modal.classList.remove('hidden');inpNome.focus();}
function salvaNome(){const n=inpNome.value.trim();if(n){localStorage.setItem('inv_nome',n);nomeUsuario=n;nomeDisp.textContent=`Olá, ${n}!`;overlay.classList.add('hidden');modal.classList.add('hidden');atualizaBtn();}}
function render(){
  tbody.innerHTML='';
  if(!itens.length){tbody.innerHTML='<tr><td colspan=5 class="text-center text-gray-500 py-4">Nenhum item local.</td></tr>';return;}
  itens.forEach((it,i)=>tbody.insertAdjacentHTML('beforeend',
    `<tr><td>${it.codigo}</td><td>${it.pLiq.toFixed(3)}</td><td>${it.tara.toFixed(3)}</td><td>${new Date(it.dt).toLocaleString()}</td><td><button data-i="${i}" class="text-red-600">X</button></td></tr>`));
}

/* ----- ENVIO ----- */
async function enviar(){
  if(enviando)return;
  const codigo=codigoInp.value.trim(), pesoTot=parseFloat(totalInp.value.replace(',','.')), tara=parseFloat(taraInp.value.replace(',','.'))||0;
  if(!codigo||isNaN(pesoTot)){alert('Preencha código e peso total');return;}
  const pesoLiq=pesoTot-tara; if(pesoLiq<=0){alert('Peso líquido <=0');return;}

  const payload={usuario:nomeUsuario,codigo,nomeProduto:MAPA[codigo]?.nome||'',pesoLiquido:pesoLiq,tara,pesoTotal:pesoTot,letraPote:letraPoteSel};

  enviando=true;atualizaBtn();status.textContent='Enviando…';status.className='sending';
  try{
    const r=await fetch(GOOGLE_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const j=await r.json();if(!r.ok||j.result!=='success')throw new Error(j.message||`HTTP ${r.status}`);
    status.textContent='Enviado com sucesso!';status.className='success flash-success';
    itens.push({codigo,pLiq:pesoLiq,tara,dt:Date.now()});localStorage.setItem(ITENS_KEY,JSON.stringify(itens));render();resetForm();
  }catch(e){status.textContent='Erro: '+e.message;status.className='error flash-error';console.error(e);}
  finally{enviando=false;atualizaBtn();setTimeout(()=>status.textContent='',7000);}
}
function resetForm(){codigoInp.value='';taraInp.value='';totalInp.value='';nomeDiv.textContent='';letraPoteSel='Nenhuma';spanLetra.textContent='';letras.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));codigoInp.focus();}

/* ----- LISTENERS ----- */
function addListeners(){
  btnReg.onclick=enviar;
  codigoInp.onblur=()=>{const d=MAPA[codigoInp.value.trim()];if(d){nomeDiv.textContent=d.nome;if(!taraInp.value)taraInp.value=d.tara.toFixed(3);letras.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));const b=letras.querySelector(`[data-letra="${d.letra}"]`);b&&b.classList.add('selected');letraPoteSel=d.letra;spanLetra.textContent=`(${d.letra})`;}}
  letras.onclick=e=>{const b=e.target.closest('.tara-button');if(!b)return;letras.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');taraInp.value=parseFloat(b.dataset.taraKg).toFixed(3);letraPoteSel=b.dataset.letra;spanLetra.textContent=`(${letraPoteSel})`;totalInp.focus();}
  taraInp.oninput=()=>{letras.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));letraPoteSel='Manual';spanLetra.textContent='(Manual)';}
  codigoInp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();taraInp.focus();}});
  taraInp  .addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();totalInp.focus();}});
  totalInp .addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();btnReg.click();}});
  document.getElementById('salvarNomeUsuarioBtn').onclick=salvaNome;
  document.getElementById('alterarNomeBtn').onclick=pedirNome;
  tbody.onclick=e=>{const i=e.target.dataset.i;if(i!==undefined){itens.splice(i,1);localStorage.setItem(ITENS_KEY,JSON.stringify(itens));render();}}
  document.getElementById('limparSessaoLocalBtn').onclick=()=>{if(confirm('Limpar registros locais?')){itens=[];localStorage.removeItem(ITENS_KEY);render();}}
}
