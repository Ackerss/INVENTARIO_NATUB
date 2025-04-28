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
    itens.push({codigo, pLiq: pesoLiq, tara, dt: Date.now()});
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
