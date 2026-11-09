
// Inicializando o mapa com Openstreetmap
const map = L.map('map', {
    maxZoom: 22,
    // Desenha também ao redor da tela para manter os polígonos durante o arraste.
    renderer: L.svg({ padding: 1 })
}).setView([-15.0644268, -57.17288757], 19);



// Carrega os quadrados de imagem do OpenStreetMap e define este como fundo inicial.
const camadaMapa = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19,
    maxZoom: 22,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Coloca os controles de zoom no canto inferior direito
map.zoomControl.setPosition('bottomright');

// Prepara o fundo de satélite; ele só aparece quando o usuário seleciona Satélite.
const camadaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    // Acima do nível 17, amplia as imagens disponíveis em vez de pedir imagens mais detalhadas.
    // Necessário, pois sem isso os poligonos tem uma delay a serem desenhados quando a tela arrasta
    maxNativeZoom: 17,
    maxZoom: 22,
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
});

// Troca somente o fundo do mapa, mantendo as salas e os blocos.
const controleFundo = L.control({ position: 'topright' });
// O Leaflet chama onAdd para criar os elementos visuais deste controle.
controleFundo.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-bar controle-fundo');
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Controles do mapa');
    // Associa cada nome de botão à sua camada e guarda os botões para atualizar a seleção.
    const opcoes = [['Mapa', camadaMapa], ['Satélite', camadaSatelite]];
    const botoes = [];

    // Cria um botão para cada fundo; aria-pressed informa qual está selecionado.
    opcoes.forEach(function ([nome, camada]) {
        const botao = L.DomUtil.create('button', 'botao-fundo', container);
        botao.type = 'button';
        botao.textContent = nome;
        botao.setAttribute('aria-pressed', String(map.hasLayer(camada)));
        botoes.push(botao);
        L.DomEvent.on(botao, 'click', function () {
            // Remove o fundo anterior antes de adicionar a camada escolhida.
            opcoes.forEach(function ([, outraCamada]) {
                if (outraCamada !== camada && map.hasLayer(outraCamada)) {
                    map.removeLayer(outraCamada);
                }
            });
            camada.addTo(map);
            // Atualiza o estado usado pelo CSS e pelos leitores de tela.
            botoes.forEach(function (outroBotao) {
                outroBotao.setAttribute('aria-pressed', String(outroBotao === botao));
            });
        });
    });
    // Volta ao enquadramento inicial do campus.
    const botaoHome = L.DomUtil.create('button', 'botao-home', container);
    botaoHome.type = 'button';
    botaoHome.title = 'Voltar ao campus';
    botaoHome.setAttribute('aria-label', 'Voltar ao campus');
    botaoHome.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3L12 3z"/></svg>';
    L.DomEvent.on(botaoHome, 'click', function () {
        // Encerra a busca de posição, libera o botão e centraliza novamente no campus.
        map.stopLocate();
        finalizarLocalizacao();
        map.setView([-15.0644268, -57.17288757], 19);
    });
    // Evita que cliques e rolagem sobre os controles também acionem o mapa.
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
};
controleFundo.addTo(map);

// Botão de localização: só solicita a posição quando o usuário toca nele.
// Guarda o marcador e o botão para reutilizá-los nos eventos de localização.
let marcadorLocalizacao;
let botaoLocalizacao;

// Cria o controle de localização junto aos botões de zoom.
const controleLocalizacao = L.control({ position: 'bottomright' });
controleLocalizacao.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-bar controle-localizacao');
    botaoLocalizacao = L.DomUtil.create('button', 'botao-localizacao', container);
    botaoLocalizacao.type = 'button';
    botaoLocalizacao.title = 'Mostrar minha localização';
    botaoLocalizacao.setAttribute('aria-label', 'Mostrar minha localização');
    botaoLocalizacao.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></svg>';

    // Evita que cliques e rolagem sobre os controles também acionem o mapa.
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    // Bloqueia novos pedidos enquanto o navegador busca a posição do usuário.
    L.DomEvent.on(botaoLocalizacao, 'click', function () {
        botaoLocalizacao.disabled = true;
        botaoLocalizacao.setAttribute('aria-busy', 'true');
        botaoLocalizacao.setAttribute('aria-label', 'Buscando sua localização');
        // Centraliza na posição encontrada, pede maior precisão e aguarda até 15 segundos.
        map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true, timeout: 15000 });
    });
    return container;
};
controleLocalizacao.addTo(map);

// Restaura o estado normal do botão tanto após sucesso quanto após erro.
function finalizarLocalizacao() {
    botaoLocalizacao.disabled = false;
    botaoLocalizacao.removeAttribute('aria-busy');
    botaoLocalizacao.setAttribute('aria-label', 'Mostrar minha localização');
}

// Ao receber a posição, cria o marcador azul ou move o marcador já existente.
map.on('locationfound', function (evento) {
    finalizarLocalizacao();
    if (!marcadorLocalizacao) {
        marcadorLocalizacao = L.circleMarker(evento.latlng, {
            // Define o tamanho em pixels, a borda branca e o preenchimento azul do marcador.
            radius: 8,
            color: '#FFFFFF',
            weight: 3,
            fillColor: '#2E7897',
            fillOpacity: 1
        }).addTo(map);
    } else {
        marcadorLocalizacao.setLatLng(evento.latlng);
    }
});

// Converte os códigos de erro da geolocalização em mensagens para o usuário.
map.on('locationerror', function (evento) {
    finalizarLocalizacao();
    const mensagens = {
        1: 'Permita o acesso à localização nas configurações do navegador e tente novamente.',
        2: 'Sua localização está indisponível. Confira se a localização do aparelho está ativada.',
        3: 'O tempo para localizar terminou. Tente novamente.'
    };
    alert(mensagens[evento.code] || 'Não foi possível obter sua localização neste navegador.');
});


// Controle dos andares do Bloco C

// Guarda as camadas por andar e os botões que serão habilitados após o carregamento.
const camadasAndarBlocoC = {};
const botoesAndares = [];
// O GeoJSON usa 0 e 1; a interface apresenta esses níveis como andares 1 e 2.
let andarBlocoC = 0;
// Posiciona o botão dos andares no lado inferior direito
const controleAndares = L.control({ position: 'bottomright' });
controleAndares.onAdd = function () {
    const container = L.DomUtil.create('div', 'controle-andares');
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Andares do Bloco C');
    // A lista dos andares começa recolhida e recebe um identificador para acessibilidade.
    const opcoes = L.DomUtil.create('div', 'opcoes-andares', container);
    opcoes.id = 'opcoes-andares-bloco-c';
    opcoes.hidden = true;

    // Reutiliza a moldura padrão do Leaflet, igual à do botão de localização.
    const molduraMenu = L.DomUtil.create('div', 'leaflet-bar', container);
    const botaoMenu = L.DomUtil.create('button', 'botao-menu-andares', molduraMenu);
    botaoMenu.type = 'button';
    botaoMenu.title = 'Selecionar andar do Bloco C';
    botaoMenu.setAttribute('aria-label', 'Abrir seleção de andares do Bloco C');
    // Liga o botão à lista de andares e informa se ela está aberta ou fechada.
    botaoMenu.setAttribute('aria-controls', opcoes.id);
    botaoMenu.setAttribute('aria-expanded', 'false');
    // O CSS desenha neste elemento o ícone a partir do arquivo SVG de camadas.
    botaoMenu.innerHTML = '<span class="icone-menu-andares" aria-hidden="true"></span>';
    // Alterna a visibilidade da lista e atualiza a descrição para leitores de tela.
    L.DomEvent.on(botaoMenu, 'click', function () {
        opcoes.hidden = !opcoes.hidden;
        botaoMenu.setAttribute('aria-expanded', String(!opcoes.hidden));
        botaoMenu.setAttribute('aria-label', opcoes.hidden
            ? 'Abrir seleção de andares do Bloco C'
            : 'Fechar seleção de andares do Bloco C');
    });

    // Monta a lista com o andar 2 acima do andar 1.
    [1, 0].forEach(function (andar) {
        const botao = L.DomUtil.create('button', 'botao-andar', opcoes);
        botao.type = 'button';
        botao.textContent = String(andar + 1);
        botao.title = `Andar ${andar + 1} do Bloco C`;
        botao.setAttribute('aria-pressed', String(andar === andarBlocoC));
        botao.disabled = true;
        // Guarda no botão o número usado no GeoJSON, sem depender do texto exibido.
        botao.dataset.andar = String(andar);
        botoesAndares.push(botao);
        // Troca apenas a camada do Bloco C e marca o botão correspondente como selecionado.
        L.DomEvent.on(botao, 'click', function () {
            if (!camadasAndarBlocoC[andar] || andar === andarBlocoC) return;
            if (camadasAndarBlocoC[andarBlocoC]) map.removeLayer(camadasAndarBlocoC[andarBlocoC]);
            andarBlocoC = andar;
            camadasAndarBlocoC[andarBlocoC].addTo(map);
            opcoes.querySelectorAll('.botao-andar').forEach(function (outroBotao) {
                outroBotao.setAttribute('aria-pressed', String(Number(outroBotao.dataset.andar) === andarBlocoC));
            });
        });
    });

    // Evita que cliques e rolagem sobre os controles também acionem o mapa.
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
};
controleAndares.addTo(map);

// Cores pelo tipo da sala
const coresPorTipo = {
    sala: '#4A90E2',
    laboratorio: '#9B59B6',
    banheiro: '#2c57e6',
    administrativo: '#F39C12',
    auditorio: '#E74C3C',
    circulacao: '#95A5A6',
    academico: '#F1C40F',
    desconhecido: '#BDC3C7'
};



// Lê um arquivo GeoJSON e desenha seus polígonos com a cor recebida.
function carregarGeoJSON(arquivo, cor, tipo) {
    // O carregamento é assíncrono: os próximos passos executam quando a resposta chega.
    fetch(arquivo)
        .then(resposta => {
            // Respostas HTTP de erro, como arquivo não encontrado, seguem para o catch.
            if (!resposta.ok) {
                throw new Error(`Não foi possível carregar ${arquivo}`);
            }

            // Converte o conteúdo JSON da resposta em um objeto JavaScript.
            return resposta.json();
        })
        .then(dados => {
            // Propriedades dos poligonos desenhados
            const opcoes = {
                // Evita recortar a geometria no limite da área visível.
                noClip: true,
                style: function (feature) {
                    // Mantém a cor recebida para campus e blocos.
                    let corLocal = cor;

                    // Para salas e demais ambientes, escolhe pelo tipo.
                    if (tipo === 'salas') {
                        const tipoLocal = feature.properties?.tipo;

                        // Usa cinza quando o tipo não está na tabela.
                        corLocal = coresPorTipo[tipoLocal] ?? '#BDC3C7';
                    }

                    return {
                        color: '#000000',     // Cor da borda preto para melhor visualização
                        fillColor: corLocal, // Cor do preenchimento.
                        weight: 2,          // Espessura do contorno.
                        fillOpacity: 0.5    // Intensidade do preenchimento.
                    };
                },

                //Pega o nome de cada elemento do GeoJSON
                //onEachFeature -> Função do leaflet que executa para cada elemento geografico
                onEachFeature: function (feature, layer) {
                    const nome = feature.properties?.nome;
                    if (!nome) return;
                    if (tipo === 'blocos' || tipo === 'campus') {
                        locaisPesquisa.push({ propriedades: feature.properties, layer, tipoCamada: tipo });
                    }

                //Pega o nome e adiciona no HTML
                const rotulo = document.createElement('span');
                rotulo.textContent = nome;


                // Método do Leaflet para anexar um rótulo/etiqueta a uma camada do mapa, neste caso um poligono
                layer.bindTooltip(rotulo,{
                    permanent:true, // Sempre visível
                    direction: 'center', // No centro do polígono (nem todos podem ficar no centro se não fica dificil de ler)
                    className: 'nome-local', // Classe dada a etiqueta para personalização, o padrão é os nomes em um balão
                
                    // Nome das salas ficam em uma camada que controlamos pelo zoom, mantem campus e blocos
                    pane: tipo === 'salas'
                        ? 'nomesSalas'
                        : tipo === 'blocos'
                            ? 'nomesBlocos'
                            : 'tooltipPane'
                });

                // Impressão de informações da sala ao clicar no poligono
                const propriedades = feature.properties ?? {};

                // Somente estes tipos terão uma ficha ao clicar.
                // Os nomes precisam ser iguais aos usados no GeoJSON.
                const tiposComInformacoes = [
                    'administrativo',
                    'sala',
                    'auditorio',
                    'laboratorio',
                    'academico'
                ];

                if (tiposComInformacoes.includes(propriedades.tipo)) {
                    if (tipo === 'salas') locaisPesquisa.push({ propriedades, layer });
                    const ficha = document.createElement('section');
                    ficha.className = 'ficha-ambiente';

                    // Usa o nome completo; se estiver vazio, mostra o nome curto.
                    const titulo = document.createElement('h2');
                    titulo.textContent =
                        propriedades.nome_completo?.trim() || propriedades.nome;
                    ficha.appendChild(titulo);

                    const tabela = document.createElement('table');
                    tabela.setAttribute('aria-label', 'Informações do local');
                    ficha.appendChild(tabela);

                    // Adiciona somente informações preenchidas.
                    function adicionarInformacao(rotulo, valor, permitirCopia = false) {
                        if (valor == null || String(valor).trim() === '') return;

                        const linha = document.createElement('tr');
                        const campo = document.createElement('th');
                        campo.scope = 'row';
                        campo.textContent = rotulo;
                        const conteudo = document.createElement('td');
                        conteudo.textContent = String(valor);
                        if (permitirCopia) {
                            conteudo.classList.add('contato-copiavel');
                            const copiar = document.createElement('button');
                            copiar.type = 'button';
                            copiar.className = 'copiar-contato';
                            copiar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
                            copiar.title = `Copiar ${rotulo.toLowerCase()}`;
                            copiar.setAttribute('aria-label', `Copiar ${rotulo.toLowerCase()}`);
                            const aviso = document.createElement('span');
                            aviso.className = 'aviso-copia';
                            aviso.setAttribute('role', 'status');
                            copiar.addEventListener('click', async function () {
                                const interacao = interacaoCopia;
                                copiar.disabled = true;
                                aviso.textContent = '';
                                try {
                                    await navigator.clipboard.writeText(String(valor));
                                    if (interacao === interacaoCopia) aviso.textContent = 'Copiado!';
                                } catch (erro) {
                                    if (interacao === interacaoCopia) {
                                        aviso.textContent = 'Não foi possível copiar. Selecione o texto e copie manualmente.';
                                    }
                                } finally {
                                    copiar.disabled = false;
                                }
                            });
                            conteudo.append(copiar, aviso);
                        }
                        linha.append(campo, conteudo);
                        tabela.appendChild(linha);
                    }

                    const tiposExibidos = {
                        sala: 'Sala de aula', administrativo: 'Administrativo',
                        auditorio: 'Auditório', laboratorio: 'Laboratório', academico: 'Acadêmico'
                    };
                    adicionarInformacao('Tipo', tiposExibidos[propriedades.tipo]);
                    if (propriedades.andar != null && String(propriedades.andar).trim() !== '') {
                        adicionarInformacao('Andar', Number(propriedades.andar) + 1);
                    }

                    if (propriedades.tipo === 'sala') {
                        adicionarInformacao('Capacidade', propriedades.capacidade);
                    }

                    if (propriedades.tipo === 'administrativo') {
                        adicionarInformacao(
                            'Telefone',
                            propriedades.contato?.telefone,
                            true
                        );
                        adicionarInformacao(
                            'E-mail',
                            propriedades.contato?.email,
                            true
                        );
                    }

                    const estiloOriginal = { color: layer.options.color, weight: layer.options.weight };
                    layer.on('click', function () {
                        fecharPainelLocal();
                        document.getElementById('conteudo-painel-local').replaceChildren(ficha);
                        document.getElementById('painel-local').hidden = false;
                        localSelecionado = { layer, estiloOriginal };
                        layer.setStyle({ color: '#00a6b5', weight: 3 });
                        // Impede que as bordas vizinhas encubram o contorno selecionado.
                        layer.bringToFront();
                    });
                    layer.on('remove', function () {
                        if (localSelecionado?.layer === layer) fecharPainelLocal();
                    });
                }
                }   
            };

            if (tipo === 'salas') {
                // Identifica as salas do Bloco C (03) que possuem um dos dois andares previstos.
                const ehAndarDoBlocoC = feature => {
                    const propriedades = feature.properties ?? {};
                    // Padroniza o identificador: tanto 3 quanto 03 passam a ser a string 03.
                    const idBloco = String(propriedades.id_bloco ?? '').padStart(2, '0');
                    return idBloco === '03' && [0, 1].includes(Number(propriedades.andar));
                };
                const recursos = dados.features ?? [];
                // Preserva os dados da coleção, substituindo apenas a lista de elementos.
                const criarColecao = features => ({ ...dados, features });
                // Exibe normalmente os locais que não pertencem aos andares do Bloco C.
                L.geoJSON(criarColecao(recursos.filter(feature => !ehAndarDoBlocoC(feature))), opcoes).addTo(map);
                // Prepara uma camada independente para cada andar, sem exibir as duas juntas.
                [0, 1].forEach(function (andar) {
                    camadasAndarBlocoC[andar] = L.geoJSON(criarColecao(recursos.filter(feature =>
                        ehAndarDoBlocoC(feature) && Number(feature.properties.andar) === andar)), opcoes);
                });
                // Exibe o andar inicial e libera os botões após os dados estarem disponíveis.
                camadasAndarBlocoC[andarBlocoC].addTo(map);
                botoesAndares.forEach(botao => { botao.disabled = false; });
            } else {
                // Campus e blocos são exibidos inteiros, sem separação por andar.
                L.geoJSON(dados, opcoes).addTo(map);
            }
        })
        .catch(erro => {
            // Registra falhas de rede, leitura ou desenho dos dados no console do navegador.
            console.error("Erro ao carregar GeoJSON:", erro);
        });
}

// Código para os nomes das salas aparecerem apenas com determinado zoom
const nomesSalas = map.createPane('nomesSalas');
nomesSalas.style.zIndex = 650;
nomesSalas.style.pointerEvents = 'none';

// Define quando os nomes das salas ficam visíveis.
function atualizarNomesSalas(){
    const zoom = map.getZoom();
    const mostrar = zoom >= 20;


    // Mantém as dimensões das etiquetas disponíveis para o Leaflet.
    // display:none zerava essas medidas durante o cálculo do primeiro zoom.
    nomesSalas.style.opacity = mostrar ? '1' : '0';

    // Recalcula depois que o Leaflet termina de atualizar as camadas do zoom.
    // Percorre apenas os elementos presentes no mapa, respeitando o andar ativo.
    requestAnimationFrame(function () {
        map.eachLayer(function (layer) {
            const etiqueta = layer.getTooltip?.();
            if (etiqueta?.options.pane === 'nomesSalas' && etiqueta.isOpen()) {
                etiqueta.update();
                //Evita um bug visual dos nomes das salas aparecerem muito pra direita quando 
                // o zoom chega no valor selecionado pela para os nomes aparecerem pela primeira vez
            }
        });
    });
}

// Código para os nomes dos blocos aparecerem apenas com determinado zoom
const nomesBlocos = map.createPane('nomesBlocos');
nomesBlocos.style.zIndex = 650;
nomesBlocos.style.pointerEvents = 'none';

function atualizarNomesBlocos() {
    // Exibe a partir do zoom 18; esconde abaixo dele.
    const mostrar = map.getZoom() >= 18;

    nomesBlocos.style.opacity = mostrar ? '1' : '0';

    // Atualiza a posição após a mudança de zoom.
    requestAnimationFrame(function () {
        map.eachLayer(function (layer) {
            const etiqueta = layer.getTooltip?.();

            if (
                etiqueta?.options.pane === 'nomesBlocos' &&
                etiqueta.isOpen()
            ) {
                etiqueta.update();
            }
        });
    });
}




//Atualiza quando o usuario der zoom in ou out
map.on('zoomend', atualizarNomesSalas);
map.on('zoomend', atualizarNomesBlocos);

atualizarNomesSalas();


// Um único painel fixo compartilha os dados dos ambientes selecionados.
// Limpa a confirmação antes de processar qualquer novo clique, inclusive no mapa.
let interacaoCopia = 0;
document.addEventListener('click', function () {
    interacaoCopia += 1;
    document.querySelectorAll('.aviso-copia').forEach(function (aviso) {
        aviso.textContent = '';
    });
}, true);
let localSelecionado = null;
function fecharPainelLocal() {
    if (localSelecionado) {
        localSelecionado.layer.setStyle(localSelecionado.estiloOriginal);
        localSelecionado.layer.eachLayer?.(poligono => poligono.getElement()?.removeAttribute('pointer-events'));
        localSelecionado = null;
    }
    document.getElementById('painel-local').hidden = true;
}
document.getElementById('fechar-painel-local').addEventListener('click', fecharPainelLocal);
document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape') fecharPainelLocal();
});

// A pesquisa usa as mesmas camadas e fichas do clique no mapa.
const locaisPesquisa = [];
const botaoPesquisa = document.getElementById('abrir-pesquisa');
const painelPesquisa = document.getElementById('painel-pesquisa');
const termoPesquisa = document.getElementById('termo-pesquisa');
const resultadosPesquisa = document.getElementById('resultados-pesquisa');
const statusPesquisa = document.getElementById('status-pesquisa');
function normalizarPesquisa(valor) {
    return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function localCorrespondePesquisa(p, termo) {
    const palavras = Array.isArray(p.palavras_chave) ? p.palavras_chave.join(' ') : p.palavras_chave;
    const nomesTipos = {
        sala: 'sala de aula salas',
        auditorio: 'auditório auditorio auditorios',
        laboratorio: 'laboratório laboratorio laboratorios',
        administrativo: 'administrativo setor administrativo',
        academico: 'acadêmico academico'
    };
    const texto = normalizarPesquisa([p.nome, p.nome_completo, p.tipo, nomesTipos[p.tipo], p.id_bloco, p.id_campus, palavras].join(' '));
    return normalizarPesquisa(termo).split(/\s+/).filter(Boolean).every(parte => texto.includes(parte));
}
botaoPesquisa.addEventListener('click', function () {
    painelPesquisa.hidden = !painelPesquisa.hidden;
    botaoPesquisa.setAttribute('aria-expanded', String(!painelPesquisa.hidden));
    if (!painelPesquisa.hidden) termoPesquisa.focus();
});
function pesquisarLocais() {
    resultadosPesquisa.replaceChildren();
    const termo = normalizarPesquisa(termoPesquisa.value);
    statusPesquisa.textContent = '';
    if (!termo) return;
    const encontrados = locaisPesquisa.filter(({ propriedades: p }) => localCorrespondePesquisa(p, termo));
    statusPesquisa.textContent = encontrados.length
        ? `${encontrados.length} resultado(s)` : 'Nenhum local encontrado.';
    encontrados.forEach(function ({ propriedades: p, layer, tipoCamada = 'salas' }) {
        const item = document.createElement('li');
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = p.nome_completo?.trim() ? `${p.nome} — ${p.nome_completo}` : p.nome;
        botao.addEventListener('click', function () {
            if (tipoCamada === 'blocos' || tipoCamada === 'campus') {
                fecharPainelLocal();
                const estiloOriginal = { color: layer.options.color, weight: layer.options.weight };
                localSelecionado = { layer, estiloOriginal };
                layer.setStyle({ color: '#00a6b5', weight: 4 });
                // O destaque continua visível, mas deixa passar cliques para as salas.
                layer.eachLayer?.(poligono => poligono.getElement()?.setAttribute('pointer-events', 'none'));
                map.fitBounds(layer.getBounds(), { maxZoom: tipoCamada === 'campus' ? 17 : 20, padding: [40, 40] });
                painelPesquisa.hidden = true;
                botaoPesquisa.setAttribute('aria-expanded', 'false');
                termoPesquisa.blur();
                botaoPesquisa.focus({ preventScroll: true });
                return;
            }
            const idBloco = String(p.id_bloco ?? '').padStart(2, '0');
            if (idBloco === '03' && [0, 1].includes(Number(p.andar))) {
                botoesAndares.find(b => Number(b.dataset.andar) === Number(p.andar))?.click();
            }
            layer.fire('click');
            painelPesquisa.hidden = true;
            botaoPesquisa.setAttribute('aria-expanded', 'false');
            termoPesquisa.blur();
            // Reserva espaço para a ficha para manter o resultado visível.
            const tamanho = map.getSize();
            const painel = document.getElementById('painel-local');
            const mobile = window.matchMedia('(max-width: 767px)').matches;
            map.fitBounds(layer.getBounds(), {
                maxZoom: 21,
                paddingTopLeft: [20, 65],
                paddingBottomRight: mobile
                    ? [20, Math.min(painel.offsetHeight + 20, tamanho.y * 0.48)]
                    : [Math.min(painel.offsetWidth + 32, tamanho.x * 0.48), 20]
            });
            botaoPesquisa.focus({ preventScroll: true });
        });
        item.appendChild(botao);
        resultadosPesquisa.appendChild(item);
    });
}
termoPesquisa.addEventListener('input', pesquisarLocais);
document.getElementById('form-pesquisa').addEventListener('submit', function (evento) {
    evento.preventDefault();
    pesquisarLocais();
});
painelPesquisa.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape') {
        painelPesquisa.hidden = true;
        botaoPesquisa.setAttribute('aria-expanded', 'false');
        botaoPesquisa.focus();
    }
});

// Carregando os GeoJson no mapa por camadas
carregarGeoJSON("dados/campus.geojson", "#9be5aeab", "campus");
carregarGeoJSON("dados/blocos.geojson", "#54bbe4ce", "blocos");
carregarGeoJSON("dados/salas.geojson", "#3f2f1e", "salas");
