const BASE_URL = 'https://api.tvmaze.com';

/* CONFIGURAÇÃO DO SUPABASE */
const SUPABASE_URL = 'https://ootblbzdxupnsurmmbsi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdGJsYnpkeHVwbnN1cm1tYnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MjU3NjcsImV4cCI6MjEwNzUwMTc2N30.o3xDzaUbOR2Ah9avM1GIJluKevds7vX2uoAGZalxxn8';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* API do Youtube para exibir trailers 
*/
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

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const authModal = document.getElementById('authModal');
const closeAuth = document.getElementById('closeAuth');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authMessage = document.getElementById('authMessage');
const authSubmit = document.getElementById('authSubmit');
const authSignup = document.getElementById('authSignup');

let currentView = 'explore';   // 'explore' | 'favorites'
let currentModalItem = null;   // título aberto no modal
let currentUser = null;        // usuário logado (ou null)

/* UTILITÁRIOS */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// Formato padrão de um título no site (mesmos campos da tabela "favoritos")
function normalizeShow(show) {
    return {
        id: show.id,
        name: show.name,
        year: show.premiered ? show.premiered.split('-')[0] : 'N/A',
        rating: show.rating?.average ?? 'N/A',
        poster: show.image?.medium || PLACEHOLDER_POSTER,
        network: show.network?.name || show.webChannel?.name || 'TV / Streaming'
    };
}

/*
   FAVORITOS (Supabase)
   A lista fica em memória (this.list) para a tela desenhar rápido;
   toda alteração é gravada na tabela "favoritos" do banco.
*/

const FavoritesStore = {
    list: [],

    // Linha do banco -> formato do site
    fromRow(row) {
        return {
            id: row.tvmaze_id,
            name: row.nome,
            year: row.ano ?? 'N/A',
            rating: row.nota ?? 'N/A',
            poster: row.poster_url || PLACEHOLDER_POSTER,
            network: row.plataforma || 'TV / Streaming'
        };
    },

    // Formato do site -> linha do banco (user_id é preenchido pelo próprio banco)
    toRow(item) {
        return {
            tvmaze_id: item.id,
            nome: item.name,
            ano: item.year === 'N/A' ? null : item.year,
            nota: typeof item.rating === 'number' ? item.rating : null,
            poster_url: item.poster === PLACEHOLDER_POSTER ? null : item.poster,
            plataforma: item.network
        };
    },

    // Busca os favoritos do usuário logado 
    async load() {
        if (!currentUser) {
            this.list = [];
            return;
        }
        const { data, error } = await db
            .from('favoritos')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('Erro ao carregar favoritos:', error);
            return;
        }
        this.list = data.map(row => this.fromRow(row));
    },

    getAll() {
        return this.list;
    },

    has(id) {
        return this.list.some(item => item.id === id);
    },

    // Retorna true se virou favorito, false se foi removido. Lança erro se o banco falhar.
    async toggle(item) {
        if (this.has(item.id)) {
            const { error } = await db.from('favoritos').delete().eq('tvmaze_id', item.id);
            if (error) throw error;
            this.list = this.list.filter(fav => fav.id !== item.id);
            return false;
        }

        const { error } = await db.from('favoritos').insert(this.toRow(item));
        if (error) throw error;
        this.list.unshift(item);
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

// Atualiza todos os corações visíveis conforme a lista atual
function syncHearts() {
    document.querySelectorAll('.card').forEach(card => {
        const btn = card.querySelector('.fav-btn');
        if (btn) setHeartState(btn, FavoritesStore.has(Number(card.dataset.id)));
    });
}

async function handleToggleFavorite(item) {
    if (!currentUser) {
        openAuthModal('Entre na sua conta para salvar favoritos.');
        return;
    }

    try {
        await FavoritesStore.toggle(item);
    } catch (error) {
        console.error('Erro ao atualizar favorito:', error);
        alert('Não foi possível atualizar seus favoritos. Tente novamente.');
        return;
    }

    updateFavCount();
    updateModalFavButton();
    if (currentView === 'favorites') renderFavorites();
    else syncHearts();
}

/* AUTENTICAÇÃO (Supabase Auth) */

function updateAuthUI() {
    const logged = !!currentUser;
    loginBtn.hidden = logged;
    logoutBtn.hidden = !logged;
    userEmail.hidden = !logged;
    userEmail.textContent = logged ? currentUser.email : '';
}

function openAuthModal(message) {
    authMessage.textContent = message || 'Entre para salvar seus favoritos em qualquer dispositivo.';
    authModal.classList.add('active');
    authEmail.focus();
}

function closeAuthModal() {
    authModal.classList.remove('active');
    authForm.reset();
}

async function handleAuth(mode) {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || password.length < 6) {
        authMessage.textContent = 'Informe um e-mail válido e uma senha com pelo menos 6 caracteres.';
        return;
    }

    authSubmit.disabled = authSignup.disabled = true;
    authMessage.textContent = mode === 'signup' ? 'Criando conta...' : 'Entrando...';

    const { data, error } = mode === 'signup'
        ? await db.auth.signUp({ email, password })
        : await db.auth.signInWithPassword({ email, password });

    authSubmit.disabled = authSignup.disabled = false;

    if (error) {
        authMessage.textContent = error.message;
        return;
    }

    // Com confirmação de e-mail ligada, o cadastro não gera sessão até o usuário confirmar.
    if (mode === 'signup' && !data.session) {
        authMessage.textContent = 'Conta criada! Confirme seu e-mail e depois clique em Entrar.';
        return;
    }

    closeAuthModal();
}

// Roda quando a página abre, no login e no logout
async function refreshAfterAuth() {
    updateAuthUI();
    await FavoritesStore.load();
    updateFavCount();
    updateModalFavButton();
    if (currentView === 'favorites') renderFavorites();
    else syncHearts();
}

db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    // setTimeout evita travar o Supabase por chamar o banco dentro deste callback
    setTimeout(refreshAfterAuth, 0);
});

/* ABAS */

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

    if (!currentUser) {
        catalogGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-heart"></i>
                <p>Entre na sua conta para ver os títulos que você favoritou.</p>
                <button type="button" class="auth-primary" id="emptyLoginBtn">Entrar</button>
            </div>
        `;
        document.getElementById('emptyLoginBtn').addEventListener('click', () => openAuthModal());
        return;
    }

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

/* CATÁLOGO E BUSCA */

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
        card.dataset.id = item.id;
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

        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // não abre o modal ao favoritar
            handleToggleFavorite(item);
        });

        catalogGrid.appendChild(card);
    });
}

/* TRAILER */

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

/* MODAL DE DETALHES */

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
    document.querySelector('.video-container').innerHTML = '<iframe id="modalTrailer" src="" allowfullscreen></iframe>';
}

/* EVENTOS */

closeModal.addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
});

closeAuth.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (authModal.classList.contains('active')) closeAuthModal();
    else if (detailModal.classList.contains('active')) closeDetailModal();
});

modalFavBtn.addEventListener('click', () => {
    if (currentModalItem) handleToggleFavorite(currentModalItem);
});

loginBtn.addEventListener('click', () => openAuthModal());
logoutBtn.addEventListener('click', () => db.auth.signOut());

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAuth('login');
});
authSignup.addEventListener('click', () => handleAuth('signup'));

tabExplore.addEventListener('click', showExplore);
tabFavorites.addEventListener('click', renderFavorites);

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleSearch();
});

updateFavCount();
loadInitialCatalog();