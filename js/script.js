
// Inicializando o mapa com Openstreetmap
const map = L.map('map').setView([-15.0644268, -57.17288757], 19);

// Coloca os controles de zoom no canto inferior direito
map.zoomControl.setPosition('bottomright');

const camadaMapa = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const camadaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 17,
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
});

// Troca somente o fundo do mapa, mantendo as salas e os blocos.
const controleFundo = L.control({ position: 'topright' });
controleFundo.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-bar controle-fundo');
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Controles do mapa');
    const opcoes = [['Mapa', camadaMapa], ['Satélite', camadaSatelite]];
    const botoes = [];

    opcoes.forEach(function ([nome, camada]) {
        const botao = L.DomUtil.create('button', 'botao-fundo', container);
        botao.type = 'button';
        botao.textContent = nome;
        botao.setAttribute('aria-pressed', String(map.hasLayer(camada)));
        botoes.push(botao);
        L.DomEvent.on(botao, 'click', function () {
            opcoes.forEach(function ([, outraCamada]) {
                if (outraCamada !== camada && map.hasLayer(outraCamada)) {
                    map.removeLayer(outraCamada);
                }
            });
            camada.addTo(map);
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
        map.stopLocate();
        finalizarLocalizacao();
        map.setView([-15.0644268, -57.17288757], 19);
    });
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
};
controleFundo.addTo(map);

// Botão de localização: só solicita a posição quando o usuário toca nele.
let marcadorLocalizacao;
let botaoLocalizacao;

const controleLocalizacao = L.control({ position: 'bottomright' });
controleLocalizacao.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-bar controle-localizacao');
    botaoLocalizacao = L.DomUtil.create('button', 'botao-localizacao', container);
    botaoLocalizacao.type = 'button';
    botaoLocalizacao.title = 'Mostrar minha localização';
    botaoLocalizacao.setAttribute('aria-label', 'Mostrar minha localização');
    botaoLocalizacao.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></svg>';

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.DomEvent.on(botaoLocalizacao, 'click', function () {
        botaoLocalizacao.disabled = true;
        botaoLocalizacao.setAttribute('aria-busy', 'true');
        botaoLocalizacao.setAttribute('aria-label', 'Buscando sua localização');
        map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true, timeout: 15000 });
    });
    return container;
};
controleLocalizacao.addTo(map);

function finalizarLocalizacao() {
    botaoLocalizacao.disabled = false;
    botaoLocalizacao.removeAttribute('aria-busy');
    botaoLocalizacao.setAttribute('aria-label', 'Mostrar minha localização');
}

map.on('locationfound', function (evento) {
    finalizarLocalizacao();
    if (!marcadorLocalizacao) {
        marcadorLocalizacao = L.circleMarker(evento.latlng, {
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

map.on('locationerror', function (evento) {
    finalizarLocalizacao();
    const mensagens = {
        1: 'Permita o acesso à localização nas configurações do navegador e tente novamente.',
        2: 'Sua localização está indisponível. Confira se a localização do aparelho está ativada.',
        3: 'O tempo para localizar terminou. Tente novamente.'
    };
    alert(mensagens[evento.code] || 'Não foi possível obter sua localização neste navegador.');
});


// Função para carregar o GeoJson

function carregarGeoJSON(arquivo, cor) {
    fetch(arquivo)
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error(`Não foi possível carregar ${arquivo}`);
            }

            return resposta.json();
        })
        .then(dados => {
            L.geoJSON(dados, {
                style: {
                    color: cor,        // Cor do contorno
                    weight: 2,         // Espessura do contorno
                    fillOpacity: 0.15  // Transparência do preenchimento
                }
            }).addTo(map);
        })
        .catch(erro => {
            console.error("Erro ao carregar GeoJSON:", erro);
        });
}

// Carregando os GeoJson no mapa por camadas
carregarGeoJSON("dados/campus.geojson", "#9be5ae");
carregarGeoJSON("dados/blocos.geojson", "#54bbe4");
carregarGeoJSON("dados/salas.geojson", "#3f2f1e");
