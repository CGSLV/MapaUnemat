
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
                style: {
                    color: cor,
                    weight: 2,
                    fillOpacity: 0.15
                },

                //Pega o nome de cada elemento do GeoJSON
                //onEachFeature -> Função do leaflet que executa para cada elemento geografico
                onEachFeature: function (feature, layer) {
                    const nome = feature.properties?.nome;
                    if (!nome) return;

                //Pega o nome e adiciona no HTML
                const rotulo = document.createElement('span');
                rotulo.textContent = nome;


                // Método do Leaflet para anexar um rótulo/etiqueta a uma camada do mapa, neste caso um poligono
                layer.bindTooltip(rotulo,{
                    permanent:true, // Sempre visível
                    direction: 'center', // No centro do polígono (nem todos podem ficar no centro se não fica dificil de ler)
                    className: 'nome-local' // Classe dada a etiqueta para personalização, o padrão é os nomes em um balão
                });
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

// Carregando os GeoJson no mapa por camadas
carregarGeoJSON("dados/campus.geojson", "#9be5ae", "campus");
carregarGeoJSON("dados/blocos.geojson", "#54bbe4", "blocos");
carregarGeoJSON("dados/salas.geojson", "#3f2f1e", "salas");
