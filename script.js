const BASE_URL = 'https://api.tvmaze.com';

// Chave gratuita da YouTube Data API v3 (console.cloud.google.com > APIs > YouTube Data API v3).
// Sem essa chave, o site usa um botão "Assistir no YouTube" em vez de tentar embutir o vídeo.
const YOUTUBE_API_KEY = 'AIzaSyB84Qs7Fqv-DBunhsKHUnS0PM8gi-YZMfg';

const catalogGrid = document.getElementById('catalogGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const detailModal = document.getElementById('detailModal');
const closeModal = document.getElementById('closeModal');

// CARREGAR CATÁLOGO INICIAL (SEM NECESSIDADE DE CHAVE OU CADASTRO)
async function loadInitialCatalog() {
    catalogGrid.innerHTML = '<p class="status-msg">Carregando catálogo completo...</p>';
    try {
        const response = await fetch(`${BASE_URL}/shows`);
        const data = await response.json();
        renderCatalog(data.slice(0, 24));
    } catch (error) {
        catalogGrid.innerHTML = '<p class="status-msg">Erro ao conectar com a API pública.</p>';
    }
}

// BUSCAR QUALQUER TÍTULO NO BANCO DE DADOS PÚBLICO
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        loadInitialCatalog();
        return;
    }

    catalogGrid.innerHTML = '<p class="status-msg">Pesquisando no catálogo global...</p>';
    try {
        const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        const shows = data.map(item => item.show);
        renderCatalog(shows);
    } catch (error) {
        catalogGrid.innerHTML = '<p class="status-msg">Ocorreu um erro ao buscar os resultados.</p>';
    }
}

// RENDERIZAÇÃO DOS CARDS
function renderCatalog(shows) {
    catalogGrid.innerHTML = '';

    if (!shows || shows.length === 0) {
        catalogGrid.innerHTML = '<p class="status-msg">Nenhum filme ou série foi encontrado para essa busca.</p>';
        return;
    }

    shows.forEach(show => {
        const title = show.name;
        const year = show.premiered ? show.premiered.split('-')[0] : 'N/A';
        const rating = show.rating?.average ? show.rating.average : 'N/A';
        const poster = show.image?.medium || 'https://via.placeholder.com/210x295/0b192c/38bdf8?text=Sem+Imagem';
        const network = show.network?.name || show.webChannel?.name || 'TV / Streaming';

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => openModal(show.id);

        card.innerHTML = `
            <img class="card-img" src="${poster}" alt="${title}">
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="rating"><i class="fa-solid fa-star"></i> ${rating}</span>
                </div>
                <div class="providers-badge">
                    <span class="provider-tag">${network}</span>
                </div>
            </div>
        `;
        catalogGrid.appendChild(card);
    });
}

// BUSCAR O ID REAL DO VÍDEO NO YOUTUBE (formato de embed suportado exige um videoId, não uma busca solta)
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

// MONTA O PLAYER (embed real) OU O BOTÃO DE FALLBACK (link de busca, sem tentar embutir)
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

// ABRIR DETALHES (MODAL)
async function openModal(showId) {
    detailModal.classList.add('active');
    document.getElementById('modalTitle').innerText = 'Carregando detalhes...';
    document.getElementById('modalOverview').innerText = '';
    document.getElementById('modalCast').innerText = '';
    document.getElementById('modalProviders').innerHTML = '';
    document.querySelector('.video-container').innerHTML = '<iframe id="modalTrailer" src="" allowfullscreen></iframe>';

    try {
        const response = await fetch(`${BASE_URL}/shows/${showId}?embed=cast`);
        const show = await response.json();

        document.getElementById('modalTitle').innerText = show.name;

        const cleanSummary = show.summary ? show.summary.replace(/<\/?[^>]+(>|$)/g, "") : 'Sinopse não disponível em português/inglês para este título.';
        document.getElementById('modalOverview').innerText = cleanSummary;

        const backdropImg = show.image?.original || 'https://via.placeholder.com/1000x500/0b192c/38bdf8?text=Sem+Imagem+de+Capa';
        document.getElementById('modalBackdrop').src = backdropImg;

        const castList = show._embedded?.cast?.slice(0, 5).map(c => c.person.name).join(', ');
        document.getElementById('modalCast').innerText = castList || 'Elenco principal não listado.';

        const platform = show.network?.name || show.webChannel?.name || 'Transmissão Geral';
        document.getElementById('modalProviders').innerHTML = `<span class="provider-tag" style="font-size: 0.9rem; padding: 0.4rem 0.8rem;">${platform}</span>`;

        const trailerQuery = `${show.name} official trailer`;
        const videoId = await fetchYoutubeTrailerId(trailerQuery);
        renderTrailer(videoId, trailerQuery);

    } catch (error) {
        console.error('Erro ao buscar detalhes:', error);
    }
}

closeModal.onclick = () => {
    detailModal.classList.remove('active');
    const iframe = document.getElementById('modalTrailer');
    if (iframe) iframe.src = '';
};

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleSearch();
});

loadInitialCatalog();