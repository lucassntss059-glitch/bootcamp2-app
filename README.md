# 🎬 OndePassa - Agregador de Filmes e Séries

O **OndePassa** é uma aplicação web moderna e responsiva para consulta e navegação em catálogos de filmes e séries de TV. A plataforma consome dados em tempo real da API pública do TVMaze e integra a YouTube Data API v3 para exibição de trailers oficiais.

---

## 🚀 Funcionalidades

- **Catálogo Dinâmico:** Exibição inicial dos títulos mais populares com capas, notas (*ratings*), ano de lançamento e plataforma de transmissão.
- **Busca em Tempo Real:** Pesquisa integrada por qualquer nome de filme ou série no banco de dados global do TVMaze.
- **Modal de Detalhes Completo:**
  - Sinopse tratada (sem tags HTML residuais).
  - Foto de capa (*backdrop*) e elenco principal.
  - Indicação da plataforma ou canal de transmissão original.
- **Player de Trailer Inteligente:**
  - Busca automatizada do `videoId` exato via **YouTube Data API v3** para player embutido sem erro de bloqueio (Erro 153/150).
  - *Fallback* inteligente com link direto de busca no YouTube caso o vídeo não esteja disponível para incorporação.
- **Interface Moderna:** Design responsivo com tema escuro (*Dark Blue Theme*), centralização dinâmica em CSS Grid e auto-ajuste para telas mobile e desktop.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Estrutura semântica e acessível.
- **CSS3:** Variáveis de cores (*CSS Variables*), Grid Layout (`repeat(auto-fit)`), Flexbox e transições responsivas.
- **JavaScript (ES6+):** Consumo assíncrono de APIs via `fetch`, manipulação dinâmica do DOM e sanitização de dados.
- **FontAwesome:** Ícones vetoriais.
- **APIs Externas:**
  - [TVMaze API](https://www.tvmaze.com/api) *(Pública e sem necessidade de chave)*
  - [YouTube Data API v3](https://developers.google.com/youtube/v3) *(Para busca e reprodução de trailers)*

---

## 📂 Estrutura do Projeto

```text
.
├── index.html   # Estrutura principal e marcação do modal
├── style.css    # Estilização visual, CSS Grid e variáveis de cor
└── script.js    # Lógica de consumo de APIs, modais e renderização
 
