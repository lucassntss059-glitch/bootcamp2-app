const BASE_URL = 'https://api.tvmaze.com';

// Chave da YouTube Data API v3 (console.cloud.google.com > APIs > YouTube Data API v3).
// Sem essa chave, o site usa um botão "Assistir no YouTube" em vez de embutir o vídeo.
// IMPORTANTE: nunca publique sua chave real em código público; restrinja-a por domínio no Google Cloud.
const YOUTUBE_API_KEY = 'AIzaSyB84Qs7Fqv-DBunhsKHUnS0PM8gi-YZMfg';

const PLACEHOLDER_POSTER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="210" height="295">' +
        '<rect width="100%" height="100%" fill="#0b192c"/>' +
        '<text x="50%" y="50%" fill="#38bdf8" font-family="sans-serif" font-size="16" ' +
        'text-anchor="middle">Sem imagem</text></svg>'
    );

const catalogGrid = document.getElementById('catalogGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const detailModal = document.getElementById('detailModal');
const closeModal = document.getElementById('closeModal');
const tabExplore = document.getElementById('tabExplore');
const tabFavorites = document.getElementById('tabFavorites');
const favCount = document.getElementById('favCount');
const modalFavBtn = document.getElementById('modalFavBtn');

let currentView = 'explore';   // 'explore' | 'favorites'
let currentModalItem = null;   // título aberto no modal (formato normalizado)

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// Converte o objeto bruto da TVMaze para o formato usado no site.
// Esse mesmo formato é o que será gravado na tabela "titulos" do banco.
function normalizeShow(show) {
    return {
        id: show.id,                                       // titulos.tvmaze_id
        name: show.name,                                   // titulos.nome
        year: show.premiered ? show.premiered.split('-')[0] : 'N/A', // titulos.ano
        rating: show.rating?.average ?? 'N/A',             // titulos.nota
        poster: show.image?.medium || PLACEHOLDER_POSTER,  // titulos.poster_url
        network: show.network?.name || show.webChannel?.name || 'TV / Streaming' // titulos.plataforma
    };
}

/* ============================================================
   FAVORITOS (camada de dados)
   Hoje usa localStorage. Quando o banco estiver pronto, basta
   trocar o corpo destas funções por chamadas à sua API
   (GET/POST/DELETE /favoritos) — o resto do código não muda.
   ============================================================ */

const FAVORITES_KEY = 'ondepassa_favoritos';

const FavoritesStore = {
    getAll() {
        try {
            return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
        } catch {
            return [];
        }
    },

    saveAll(list) {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
        } catch (error) {
            console.error('Não foi possível salvar os favoritos:', error);
        }
    },

    has(id) {
        return this.getAll().some(item => item.id === id);
    },

    // Retorna true se o título passou a ser favorito, false se foi removido.
    toggle(item) {
        const list = this.getAll();
        const index = list.findIndex(fav => fav.id === item.id);

        if (index >= 0) {
            list.splice(index, 1);
            this.saveAll(list);
            return false;
        }

        list.unshift({ ...item, savedAt: new Date().toISOString() }); // favoritos.criado_em
        this.saveAll(list);
        return true;
    }
};

function updateFavCount() {
    favCount.textContent = FavoritesStore.getAll().length;
}

function setHeartState(button, isFav) {
    button.classList.toggle('active', isFav);
    const icon = button.querySelector('i');
    if (icon) icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
}

function updateModalFavButton() {
    if (!currentModalItem) return;
    const isFav = FavoritesStore.has(currentModalItem.id);
    setHeartState(modalFavBtn, isFav);
    modalFavBtn.querySelector('span').textContent = isFav ? 'Remover dos favoritos' : 'Favoritar';
}

// Alterna o favorito e sincroniza a interface (card, modal, contador e aba).
function handleToggleFavorite(item, cardButton) {
    const isFav = FavoritesStore.toggle(item);
    updateFavCount();

    if (cardButton) setHeartState(cardButton, isFav);
    if (currentModalItem && currentModalItem.id === item.id) updateModalFavButton();

    // Na aba de favoritos, remover um título tira o card da lista.
    if (currentView === 'favorites') renderFavorites();
}

/* ============================================================
   ABAS
   ============================================================ */

function setActiveTab(view) {
    currentView = view;
    tabExplore.classList.toggle('active', view === 'explore');
    tabFavorites.classList.toggle('active', view === 'favorites');
}

function showExplore() {
    setActiveTab('explore');
    handleSearch();
}

function renderFavorites() {
    setActiveTab('favorites');
    const favorites = FavoritesStore.getAll();

    if (favorites.length === 0) {
        catalogGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-heart"></i>
                <p>Você ainda não favoritou nenhum título.<br>
                Toque no coração de um filme ou série para salvá-lo aqui.</p>
            </div>
        `;
        return;
    }

    renderCards(favorites);
}

/* ============================================================
   CATÁLOGO E BUSCA
   ============================================================ */

async function loadInitialCatalog() {
    catalogGrid.innerHTML = '<p class="status-msg">Carregando catálogo completo...</p>';
    try {
        const response = await fetch(`${BASE_URL}/shows`);
        const data = await response.json();
        renderCards(data.slice(0, 24).map(normalizeShow));
    } catch (error) {
        catalogGrid.innerHTML = '<p class="status-msg">Erro ao conectar com a API pública.</p>';
    }
}

async function handleSearch() {
    // Pesquisar sempre leva o usuário de volta para a aba Explorar.
    if (currentView !== 'explore') setActiveTab('explore');

    const query = searchInput.value.trim();
    if (!query) {
        loadInitialCatalog();
        return;
    }

    catalogGrid.innerHTML = '<p class="status-msg">Pesquisando no catálogo global...</p>';
    try {
        const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        renderCards(data.map(item => normalizeShow(item.show)));
    } catch (error) {
        catalogGrid.innerHTML = '<p class="status-msg">Ocorreu um erro ao buscar os resultados.</p>';
    }
}

// Recebe títulos já normalizados (via busca ou via favoritos).
function renderCards(items) {
    catalogGrid.innerHTML = '';

    if (!items || items.length === 0) {
        catalogGrid.innerHTML = '<p class="status-msg">Nenhum filme ou série foi encontrado para essa busca.</p>';
        return;
    }

    items.forEach(item => {
        const isFav = FavoritesStore.has(item.id);

        const card = document.createElement('div');
        card.className = 'card';
        card.addEventListener('click', () => openModal(item.id));

        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" type="button"
                    aria-label="Favoritar ${escapeHtml(item.name)}">
                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <img class="card-img" src="${item.poster}" alt="${escapeHtml(item.name)}">
            <div class="card-body">
                <div class="card-title">${escapeHtml(item.name)}</div>
                <div class="card-meta">
                    <span>${item.year}</span>
                    <span class="rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
                </div>
                <div class="providers-badge">
                    <span class="provider-tag">${escapeHtml(item.network)}</span>
                </div>
            </div>
        `;

        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // não abre o modal ao favoritar
            handleToggleFavorite(item, favBtn);
        });

        catalogGrid.appendChild(card);
    });
}

/* ============================================================
   TRAILER
   ============================================================ */

async function fetchYoutubeTrailerId(query) {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
        return null;
    }
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.items?.[0]?.id?.videoId || null;
    } catch (error) {
        console.error('Erro ao buscar trailer no YouTube:', error);
        return null;
    }
}

function renderTrailer(videoId, searchQuery) {
    const container = document.querySelector('.video-container');

    if (videoId) {
        container.innerHTML = `<iframe id="modalTrailer" src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
    } else {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        container.innerHTML = `
            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer"
               style="display:flex; align-items:center; justify-content:center; height:100%; color:#e2e8f0; text-decoration:none; font-weight:600; gap:0.5rem;">
                <i class="fa-brands fa-youtube" style="color:#ef4444; font-size:1.4rem;"></i>
                Assistir no YouTube
            </a>
        `;
    }
}

/* ============================================================
   MODAL DE DETALHES
   ============================================================ */

async function openModal(showId) {
    detailModal.classList.add('active');
    currentModalItem = null;
    modalFavBtn.hidden = true;

    document.getElementById('modalTitle').innerText = 'Carregando detalhes...';
    document.getElementById('modalOverview').innerText = '';
    document.getElementById('modalCast').innerText = '';
    document.getElementById('modalProviders').innerHTML = '';
    document.querySelector('.video-container').innerHTML = '<iframe id="modalTrailer" src="" allowfullscreen></iframe>';

    try {
        const response = await fetch(`${BASE_URL}/shows/${showId}?embed=cast`);
        const show = await response.json();

        // Se o usuário fechou o modal enquanto carregava, não faz nada.
        if (!detailModal.classList.contains('active')) return;

        currentModalItem = normalizeShow(show);
        modalFavBtn.hidden = false;
        updateModalFavButton();

        document.getElementById('modalTitle').innerText = show.name;

        const cleanSummary = show.summary
            ? show.summary.replace(/<\/?[^>]+(>|$)/g, '')
            : 'Sinopse não disponível em português/inglês para este título.';
        document.getElementById('modalOverview').innerText = cleanSummary;

        document.getElementById('modalBackdrop').src = show.image?.original || PLACEHOLDER_POSTER;

        const castList = show._embedded?.cast?.slice(0, 5).map(c => c.person.name).join(', ');
        document.getElementById('modalCast').innerText = castList || 'Elenco principal não listado.';

        const platform = show.network?.name || show.webChannel?.name || 'Transmissão Geral';
        document.getElementById('modalProviders').innerHTML =
            `<span class="provider-tag" style="font-size: 0.9rem; padding: 0.4rem 0.8rem;">${escapeHtml(platform)}</span>`;

        const trailerQuery = `${show.name} official trailer`;
        const videoId = await fetchYoutubeTrailerId(trailerQuery);
        renderTrailer(videoId, trailerQuery);

    } catch (error) {
        console.error('Erro ao buscar detalhes:', error);
        document.getElementById('modalTitle').innerText = 'Não foi possível carregar os detalhes.';
    }
}

function closeDetailModal() {
    detailModal.classList.remove('active');
    currentModalItem = null;
    // Esvazia o player para parar o vídeo
    document.querySelector('.video-container').innerHTML = '<iframe id="modalTrailer" src="" allowfullscreen></iframe>';
}

/* ============================================================
   EVENTOS
   ============================================================ */

closeModal.addEventListener('click', closeDetailModal);

// Fecha ao clicar fora da janela ou ao apertar Esc
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('active')) closeDetailModal();
});

modalFavBtn.addEventListener('click', () => {
    if (!currentModalItem) return;
    const item = currentModalItem;
    const isFav = FavoritesStore.toggle(item);
    updateFavCount();
    updateModalFavButton();

    // Mantém os corações dos cards visíveis em sincronia
    if (currentView === 'favorites') {
        renderFavorites();
    } else {
        document.querySelectorAll('.card').forEach(card => {
            const title = card.querySelector('.card-title')?.textContent;
            if (title === item.name) setHeartState(card.querySelector('.fav-btn'), isFav);
        });
    }
});

tabExplore.addEventListener('click', showExplore);
tabFavorites.addEventListener('click', renderFavorites);

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleSearch();
});

updateFavCount();
loadInitialCatalog();
