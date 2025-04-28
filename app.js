/*  app.js  –  v16  (28-abr-2025)
   ------------------------------------------------------
   • tecla “Ir/Next/Go” funcional em teclados Android
   • tara e letra puxadas automaticamente do potes.json
   • registros locais persistentes com exclusão individual
   ------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', main);

async function main() {
  /* ------------ CONFIG ------------ */
  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycby9BdmtpHuyxQzyfMVNPIXisx_ADVo-Nod_HmTv-5ayEKzMjTDglmxTUqkI_ZeB8exN/exec';
  const LS_ITEMS  = 'invGranelItens';
  const LS_USR    = 'invGranelUser';

  /* ------------ DOM ------------ */
  const $   = id => document.getElementById(id);
  const codigoInp   = $('codigoProduto');
  const taraInp     = $('pesoTaraKg');
  const pesoTotInp  = $('pesoTotalKg');
  const sendBtn     = $('registrarItemBtn');
  const statusBox   = $('statusEnvio');
  const nomeProdDiv = $('nomeProdutoDisplay');
  const taraBox     = $('botoesTaraContainer');
  const listaBody   = $('listaItensBody');
  const limparBtn   = $('limparSessaoLocalBtn');

  const modalOver = $('overlayNomeUsuario');
  const modalDlg  = $('modalNomeUsuario');
  const nomeInp   = $('inputNomeUsuario');
  const salvaNm   = $('salvarNomeUsuarioBtn');
  const nomeLbl   = $('nomeUsuarioDisplay');

  /* ------------ estado ------------ */
  const MAPA = {};          // codigo → {Nome,tara,letra}
  let letraSel = '';
  let itensLocais = JSON.parse(localStorage.getItem(LS_ITEMS) || '[]');
  let usuario = localStorage.getItem(LS_USR) || '';

  /* ------------ util ------------- */
  const goKeys = key => ['Enter','Go','Next','Done','Send','Unidentified'].includes(key);

  /* ------------ potes.json ------------ */
  try {
    const arr = await (await fetch('potes.json',{cache:'no-store'})).json();
    arr.forEach(p => MAPA[p.codigo] = p);
  } catch(e){ console.error('Falha ao ler potes.json',e); }

  /* ------------ modal nome ------------ */
  if (!usuario) abrirModal(); else mostrarNome();
  nomeLbl.addEventListener('click', abrirModal);
  salvaNm.addEventListener('click', gravaNome);
  nomeInp.addEventListener('keydown', e=>{ if(e.key==='Enter') gravaNome(); });

  function abrirModal(){ modalOver.style.display=modalDlg.style.display='block'; nomeInp.focus(); }
  function gravaNome(){
      const n = nomeInp.value.trim();
      if(!n) return alert('Digite seu nome');
      usuario=n; localStorage.setItem(LS_USR,n); mostrarNome();
      modalOver.style.display=modalDlg.style.display='none'; habilitaBtn();
  }
  function mostrarNome(){ nomeLbl.textContent = `Olá, ${usuario}!`; }

  /* ------------ registros locais ------------ */
  renderLista();
  limparBtn.addEventListener('click', ()=>{
      if(!confirm('Apagar registros locais?')) return;
      itensLocais=[]; salvaLocais(); renderLista();
  });
  listaBody.addEventListener('click', ev=>{
      if(!ev.target.closest('.del')) return;
      const i = +ev.target.dataset.idx;
      itensLocais.splice(i,1); salvaLocais(); renderLista();
  });
  function salvaLocais(){ localStorage.setItem(LS_ITEMS,JSON.stringify(itensLocais)); }
  function renderLista(){
     listaBody.innerHTML = itensLocais.length
       ? itensLocais.map((it,i)=>
          `<tr>
             <td>${it.codigo}</td><td>${it.pesoLiquido}</td>
             <td>${it.tara}</td><td>${it.dataHora}</td>
             <td><button class="action-button del" data-idx="${i}">🗑</button></td>
          </tr>`).join('')
       : '<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum item local.</td></tr>';
  }

  /* ------------ tara rápida ------------ */
  taraBox.addEventListener('click', ev=>{
     const btn = ev.target.closest('.tara-button'); if(!btn) return;
     [...taraBox.children].forEach(b=>b.classList.remove('selected'));
     btn.classList.add('selected');
     taraInp.value = (+btn.dataset.taraKg || 0).toFixed(3).replace(/\.?0+$/,'');
     letraSel = btn.dataset.letra;
     pesoTotInp.focus(); pesoTotInp.select(); habilitaBtn();
  });

  /* ------------ auto-nome & tara pelo código ------------ */
  codigoInp.addEventListener('blur', preencherPeloCodigo);
  function preencherPeloCodigo(){
     const c = codigoInp.value.trim();
     const p = MAPA[c];
     nomeProdDiv.textContent = p ? p.Nome : '';
     if (p){
        if(!taraInp.value) taraInp.value = +p.tara ? p.tara.toFixed(3).replace(/\.?0+$/,'') : '';
        letraSel = p.letra || '';
        marcarBotao(letraSel);
     }
  }
  function marcarBotao(letra){
     [...taraBox.children].forEach(b=>{
        b.classList.toggle('selected', b.dataset.letra===letra);
     });
  }

  /* ------------ mover foco (“Ir”) ------------ */
  [codigoInp,taraInp,pesoTotInp].forEach((inp,idx,arr)=>{
     ['keydown','keyup','keypress'].forEach(evt=>{
        inp.addEventListener(evt,e=>{
           if(goKeys(e.key)) {
              if(evt==='keydown') e.preventDefault();
              if(evt==='keyup'){
                 if(idx<2){ arr[idx+1].focus(); arr[idx+1].select(); }
                 else      sendBtn.click();
              }
           }
        });
     });
  });

  /* ------------ botão habilitado? ------------ */
  [codigoInp,taraInp,pesoTotInp].forEach(i=>i.addEventListener('input', habilitaBtn));
  function habilitaBtn(){
     sendBtn.disabled = !(usuario && codigoInp.value && pesoTotInp.value);
  }

  /* ------------ enviar ------------ */
  sendBtn.addEventListener('click', async ()=>{
      habilitaBtn(); if(sendBtn.disabled) return;

      const codigo   = codigoInp.value.trim();
      const tara     = +(taraInp.value.replace(',','.'))||0;
      const pesoTot  = +(pesoTotInp.value.replace(',','.'));
      const pesoLiq  = +(pesoTot - tara).toFixed(3);
      const produto  = MAPA[codigo]?.Nome || '';

      const payload = {
        usuario: usuario,
        codigo: codigo,
        nomeProduto: produto,
        pesoLiquido: pesoLiq,
        tara: tara,
        pesoTotal: pesoTot,
        letraPote: letraSel || MAPA[codigo]?.letra || ''
      };

      statusBox.textContent='Enviando…'; statusBox.className='sending';

      try{
          const r = await fetch(GOOGLE_SCRIPT_URL,{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify(payload)
          });
          const j = await r.json();
          if(j.result!=='success') throw new Error(j.message||'Falha no script');

          statusBox.textContent='Enviado ✔'; statusBox.className='success';

          itensLocais.unshift({
             codigo: payload.codigo,
             pesoLiquido: pesoLiq.toFixed(3),
             tara: tara.toFixed(3),
             dataHora: new Date().toLocaleString('pt-BR')
          });
          salvaLocais(); renderLista();

          // limpa form
          [codigoInp,taraInp,pesoTotInp].forEach(i=>i.value='');
          nomeProdDiv.textContent=''; letraSel=''; marcarBotao('');
          habilitaBtn(); codigoInp.focus();

      }catch(err){
          statusBox.textContent='Erro: '+err.message; statusBox.className='error';
      }finally{
          setTimeout(()=>statusBox.textContent='',6000);
      }
  });
}
