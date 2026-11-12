const $ = id => document.getElementById(id);
const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const atividades = {
  campo: ['Trabalho a céu aberto', ['Exposição solar e calor', 'Animais peçonhentos', 'Terreno irregular', 'Condições climáticas adversas']],
  altura: ['Trabalho em altura', ['Queda de altura', 'Queda de ferramentas', 'Ausência de proteção coletiva']],
  escavacao: ['Escavação', ['Desmoronamento', 'Queda em escavação', 'Interferência de redes subterrâneas']],
  manutencao: ['Manutenção de máquinas', ['Partes móveis', 'Choque elétrico', 'Energização inesperada']],
  carga: ['Movimentação de cargas', ['Queda de materiais', 'Atropelamento', 'Sobrecarga física']]
};
const direcoes = ['À Frente', 'Atrás', 'Laterais', 'Acima', 'Abaixo', 'Disposição / Equipamentos e atividade'];
const codigos = { '1234': 'Responsável 1', '5678': 'Responsável 2', '9012': 'Responsável 3' };
let usuario = null, timer;
let inspecaoEmEdicao = null;
function carregar(chave) {
  try { const dados = JSON.parse(localStorage.getItem(chave)); return Array.isArray(dados) ? dados : []; }
  catch { return []; }
}
let inspecoes = carregar('sigro_inspecoes'), acoes = carregar('sigro_acoes');
const quaseAcidentes = carregar('sigro_quase_acidentes');
function notificar(texto) {
  $('notificacao').textContent = texto;
  $('notificacao').hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => $('notificacao').hidden = true, 4000);
}
function salvar() {
  try {
    localStorage.setItem('sigro_inspecoes', JSON.stringify(inspecoes));
    localStorage.setItem('sigro_acoes', JSON.stringify(acoes));
    return true;
  } catch { notificar('Não foi possível salvar. O armazenamento pode estar cheio.'); return false; }
}
const opcoes = itens => '<option value="">Selecione</option>' + itens.map(([valor, nome]) => `<option value="${escapar(valor)}">${escapar(nome)}</option>`).join('');
const cor = nivel => nivel >= 15 ? 'red' : nivel >= 10 ? 'orange' : nivel >= 5 ? 'yellow' : 'green';
const data = i => i.data || '';
const item = conteudo => `<div class="item">${conteudo}</div>`;
function atualizar() {
  const indicadores = {
    'Inspeções realizadas': inspecoes.length,
    'Quase acidentes relatados': quaseAcidentes.length,
    'Riscos identificados': inspecoes.reduce((total, i) => total + i.riscosAPR.length + Object.keys(i.falaad || {}).length + (i.extras?.trim() ? 1 : 0), 0),
    'Ações pendentes': acoes.filter(a => a.status === 'Pendente').length,
    'Ações concluídas': acoes.filter(a => a.status === 'Concluído').length
  };
  $('indicadores').innerHTML = Object.entries(indicadores).map(([nome, total]) => `<div class="card"><h3>${nome}</h3><strong>${total}</strong></div>`).join('');
  $('ultimos').innerHTML = inspecoes.slice(-5).reverse().map(i => item(`<strong>${escapar(i.nome)}</strong> — ${escapar(i.area)}<small>${escapar(data(i))} | ${escapar(atividades[i.atividade]?.[0] || i.atividade)}</small>`)).join('') || 'Nenhum registro.';
  const selecionada = $('acaoInspecao').value;
  $('acaoInspecao').innerHTML = opcoes(inspecoes.map(i => [i.id, `${i.nome} — ${data(i)}`]));
  $('acaoInspecao').value = selecionada;
  $('listaAcoes').innerHTML = usuario ? acoes.map(a => item(`
    <strong>${escapar(a.descricao)}</strong><p>Medida: ${escapar(a.medida)}</p>
    <p>Responsável: ${escapar(a.responsavel || 'Não definido')}</p><p>Registrado por: ${escapar(a.registradoPor)}</p>
    <p>Prazo: ${escapar(a.prazo || 'Não definido')}</p><span class="status ${a.status === 'Concluído' ? 'green' : 'yellow'}">${escapar(a.status)}</span>
    ${a.status !== 'Concluído' ? `<button class="primary" data-concluir="${escapar(a.id)}">Marcar como concluída</button>` : ''}
    ${evidenciaHTML(a)}
  `)).join('') || 'Nenhuma ação cadastrada.' : '';
  $('listaMapa').innerHTML = inspecoes.map(i => {
    const nivel = i.probabilidade * i.severidade;
    return item(`<strong>${escapar(i.nome)} — ${escapar(i.area)}</strong><p>Probabilidade: ${i.probabilidade} | Severidade: ${i.severidade}</p><span class="status ${cor(nivel)}">${nivel} pontos</span>`);
  }).join('') || 'Nenhum risco registrado.';
  $('listaInspecoes').innerHTML = inspecoes.slice().reverse().map(i => item(`
    <strong>${escapar(i.nome)}</strong><p>Área: ${escapar(i.area)}</p>
    <p>Atividade: ${escapar(atividades[i.atividade]?.[0] || i.atividade)}</p><p>Data: ${escapar(data(i))}</p>
    <p>Riscos APR: ${escapar(i.riscosAPR.join(', '))}</p>
    ${Object.entries(i.falaad || {}).map(([tipo, texto]) => `<p>${escapar(tipo)}: ${escapar(texto)}</p>`).join('')}
    <p>Riscos adicionais: ${escapar(i.extras || 'Nenhum')}</p>
    <div class="acoes-inspecao">
      <button type="button" class="primary" data-editar="${escapar(i.id)}" aria-label="Editar inspeção de ${escapar(i.nome)}">Editar</button>
      <button type="button" class="danger" data-remover="${escapar(i.id)}" aria-label="Remover inspeção de ${escapar(i.nome)}">Remover</button>
    </div>
  `)).join('') || 'Nenhuma inspeção registrada.';
  $('listaQuaseAcidentes').innerHTML = quaseAcidentes.slice().reverse().map(r => item(`
    <strong>${escapar(r.local)}</strong>
    <p>Data: ${escapar(r.data.split('-').reverse().join('/'))}${r.hora ? ` às ${escapar(r.hora)}` : ''}</p>
    <p>Relatado por: ${escapar(r.nome || 'Não informado')}</p>
    <p class="texto-relato"><strong>O que aconteceu:</strong> ${escapar(r.descricao)}</p>
    <p class="texto-relato"><strong>Possíveis consequências:</strong> ${escapar(r.consequencia)}</p>
    <p class="texto-relato"><strong>Medidas / prevenção:</strong> ${escapar(r.medidas || 'Não informado')}</p>
  `)).join('') || 'Nenhum relato de quase acidente registrado.';
}
const dataLocalHoje = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
};
$('relatoData').value = $('relatoData').max = dataLocalHoje();
$('formQuaseAcidente').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  $('relatoData').max = dataLocalHoje();
  if (!form.reportValidity()) return;
  const relato = {
    id: Date.now(), nome: $('relatoNome').value.trim(), data: $('relatoData').value,
    hora: $('relatoHora').value, local: $('relatoLocal').value.trim(),
    descricao: $('relatoDescricao').value.trim(), consequencia: $('relatoConsequencia').value.trim(),
    medidas: $('relatoMedidas').value.trim()
  };
  if (!relato.local || !relato.descricao || !relato.consequencia) return notificar('Preencha o local, a descrição e as possíveis consequências.');
  quaseAcidentes.push(relato);
  try {
    localStorage.setItem('sigro_quase_acidentes', JSON.stringify(quaseAcidentes));
  } catch {
    quaseAcidentes.pop();
    notificar('Não foi possível salvar o relato. Verifique o armazenamento do navegador.');
    return;
  }
  form.reset();
  $('relatoData').value = dataLocalHoje();
  atualizar();
  notificar('Relato de quase acidente registrado!');
});
function evidenciaHTML(acao) {
  const url = acao.evidencia || '';
  if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(url)) return `<img class="evidencia" src="${escapar(url)}" alt="${escapar(acao.nomeArquivo || 'Evidência da ação')}">`;
  if (/^data:application\/pdf;base64,/i.test(url)) return `<p><a href="${escapar(url)}" download="${escapar(acao.nomeArquivo || 'evidencia.pdf')}">Baixar evidência PDF</a></p>`;
  return '<p>Sem evidência de resolução.</p>';
}
document.querySelector('nav').addEventListener('click', e => {
  const botao = e.target.closest('[data-pagina]');
  if (!botao) return;
  document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== botao.dataset.pagina);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b === botao));
  atualizar();
});
$('area').innerHTML = opcoes(['Produção', 'Manutenção', 'Logística', 'Administrativo', 'Campo'].map(a => [a, a]));
$('atividade').innerHTML = opcoes(Object.entries(atividades).map(([id, a]) => [id, a[0]]));
for (const [id, nomes] of Object.entries({ probabilidade: ['Rara', 'Pouco provável', 'Possível', 'Provável', 'Muito provável'], severidade: ['Leve', 'Moderada', 'Grave', 'Muito grave', 'Crítica'] })) {
  $(id).innerHTML = nomes.map((nome, i) => `<option value="${i + 1}">${i + 1} — ${nome}</option>`).join('');
}
$('atividade').addEventListener('change', () => {
  $('apr').textContent = atividades[$('atividade').value]?.[1].join(' • ') || '';
});
$('falaad').innerHTML = direcoes.map((nome, i) => `<div class="item"><label><input type="checkbox" data-direcao="${i}">${nome}</label><textarea id="direcao-${i}" aria-label="Descreva o risco: ${nome}" placeholder="Descreva o risco identificado" hidden disabled></textarea></div>`).join('');
$('falaad').addEventListener('change', e => {
  if (!e.target.matches('[data-direcao]')) return;
  const campo = $(`direcao-${e.target.dataset.direcao}`);
  campo.hidden = campo.disabled = !e.target.checked;
  campo.required = e.target.checked;
});
function limparFormularioInspecao() {
  inspecaoEmEdicao = null;
  $('formInspecao').reset();
  $('apr').textContent = '';
  $('salvarInspecao').textContent = 'Registrar inspeção';
  $('cancelarEdicao').hidden = true;
  document.querySelector('#inspecao h2').textContent = 'Inspeção de Segurança | APR + FALAAD';
  document.querySelectorAll('#falaad textarea').forEach(c => { c.hidden = c.disabled = true; c.required = false; });
}
$('cancelarEdicao').addEventListener('click', () => {
  limparFormularioInspecao();
  document.querySelector('nav [data-pagina="registros"]').click();
});
$('listaInspecoes').addEventListener('click', e => {
  const botao = e.target.closest('[data-editar], [data-remover]');
  if (!botao) return;
  const inspecao = inspecoes.find(i => String(i.id) === (botao.dataset.editar ?? botao.dataset.remover));
  if (!inspecao) return;
  if (botao.hasAttribute('data-remover')) {
    const vinculadas = acoes.filter(a => a.inspecao === inspecao.id).length;
    if (!confirm(`Remover a inspeção de "${inspecao.nome}"?${vinculadas ? ` As ${vinculadas} ação(ões) vinculada(s) também serão removidas.` : ''} Esta operação não pode ser desfeita.`)) return;
    const anteriores = inspecoes, acoesAnteriores = acoes;
    inspecoes = inspecoes.filter(i => i.id !== inspecao.id);
    acoes = acoes.filter(a => a.inspecao !== inspecao.id);
    if (!salvar()) { inspecoes = anteriores; acoes = acoesAnteriores; salvar(); return; }
    if (inspecaoEmEdicao === inspecao.id) limparFormularioInspecao();
    atualizar();
    notificar('Inspeção removida!');
    return;
  }
  limparFormularioInspecao();
  inspecaoEmEdicao = inspecao.id;
  for (const campo of ['nome', 'area', 'atividade', 'probabilidade', 'severidade', 'extras']) {
    $(campo).value = inspecao[campo] ?? '';
  }
  $('atividade').dispatchEvent(new Event('change'));
  document.querySelectorAll('[data-direcao]').forEach(c => {
    const texto = inspecao.falaad?.[direcoes[c.dataset.direcao]];
    c.checked = texto !== undefined;
    c.dispatchEvent(new Event('change', { bubbles: true }));
    $(`direcao-${c.dataset.direcao}`).value = texto ?? '';
  });
  $('salvarInspecao').textContent = 'Salvar alterações';
  $('cancelarEdicao').hidden = false;
  document.querySelector('#inspecao h2').textContent = 'Editar inspeção | APR + FALAAD';
  document.querySelector('nav [data-pagina="inspecao"]').click();
  $('nome').focus();
});
$('formInspecao').addEventListener('submit', e => {
  e.preventDefault();
  const atividade = $('atividade').value;
  const falaad = {};
  document.querySelectorAll('[data-direcao]:checked').forEach(c => falaad[direcoes[c.dataset.direcao]] = $(`direcao-${c.dataset.direcao}`).value.trim());
  const inspecao = { id: Date.now(), nome: $('nome').value.trim(), area: $('area').value, atividade, riscosAPR: atividades[atividade][1], falaad, probabilidade: Number($('probabilidade').value), severidade: Number($('severidade').value), extras: $('extras').value.trim(), data: new Date().toLocaleDateString('pt-BR') };
  if (!inspecao.nome) return notificar('Informe o nome do colaborador.');
  if (inspecaoEmEdicao !== null) {
    const indice = inspecoes.findIndex(i => i.id === inspecaoEmEdicao);
    if (indice === -1) return notificar('Inspeção não encontrada.');
    const anterior = inspecoes[indice];
    inspecoes[indice] = { ...anterior, ...inspecao, id: anterior.id, data: anterior.data };
    if (!salvar()) { inspecoes[indice] = anterior; return; }
    limparFormularioInspecao();
    document.querySelector('nav [data-pagina="registros"]').click();
    notificar('Inspeção atualizada!');
    return;
  }
  inspecoes.push(inspecao);
  acoes.push({ id: inspecao.id + 1, inspecao: inspecao.id, descricao: `Inspeção: ${inspecao.nome} — ${inspecao.area}`, medida: 'Avaliar e registrar a medida necessária.', status: 'Pendente', registradoPor: 'Sistema' });
  if (!salvar()) { inspecoes.pop(); acoes.pop(); return; }
  limparFormularioInspecao();
  atualizar(); notificar('Inspeção registrada!');
});
$('formAcesso').addEventListener('submit', e => {
  e.preventDefault();
  usuario = codigos[$('codigo').value];
  if (!usuario) return notificar('Código incorreto.');
  $('formAcesso').hidden = true; $('areaResponsavel').hidden = false;
  $('usuario').textContent = usuario; $('codigo').value = ''; atualizar();
});
$('sair').addEventListener('click', () => {
  usuario = null; $('formAcesso').hidden = false; $('areaResponsavel').hidden = true; atualizar();
});
const lerArquivo = arquivo => new Promise((resolve, reject) => {
  const leitor = new FileReader();
  leitor.onload = () => resolve(leitor.result); leitor.onerror = reject; leitor.readAsDataURL(arquivo);
});
$('formAcao').addEventListener('submit', async e => {
  e.preventDefault();
  if (!usuario) return;
  const form = e.target, botao = form.querySelector('button');
  const acao = { id: Date.now(), inspecao: Number($('acaoInspecao').value), descricao: $('descricao').value.trim(), medida: $('medida').value.trim(), responsavel: $('responsavel').value.trim(), prazo: $('prazo').value, registradoPor: usuario };
  if (!inspecoes.some(i => i.id === acao.inspecao) || !acao.descricao || !acao.medida || !acao.responsavel) return notificar('Preencha os campos obrigatórios.');
  const arquivo = $('evidencia').files[0];
  if (arquivo && (!/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(arquivo.type) || arquivo.size > 2 * 1024 * 1024)) return notificar('Envie PNG, JPEG, GIF, WebP ou PDF de até 2 MB.');
  botao.disabled = true;
  try {
    acao.evidencia = arquivo ? await lerArquivo(arquivo) : '';
    if (!usuario || usuario !== acao.registradoPor) return;
    acao.nomeArquivo = arquivo?.name || ''; acao.status = acao.evidencia ? 'Concluído' : 'Pendente';
    acoes.push(acao);
    if (!salvar()) { acoes.pop(); return; }
    form.reset(); atualizar(); notificar('Ação registrada!');
  } catch { notificar('Não foi possível ler a evidência.'); }
  finally { botao.disabled = false; }
});
$('listaAcoes').addEventListener('click', e => {
  const botao = e.target.closest('[data-concluir]');
  if (!usuario || !botao) return;
  const acao = acoes.find(a => String(a.id) === botao.dataset.concluir);
  if (!acao) return;
  acao.status = 'Concluído';
  if (!salvar()) { acao.status = 'Pendente'; return; }
  atualizar(); notificar('Ação concluída!');
});
$('matriz').innerHTML = Array.from({ length: 25 }, (_, i) => {
  const nivel = (Math.floor(i / 5) + 1) * (i % 5 + 1);
  return `<div class="heat ${cor(nivel)}">${nivel}</div>`;
}).join('');
atualizar();
