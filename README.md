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
## 🗄️ Modelo de Dados

O banco tem uma única tabela, favoritos. Os usuários ficam em auth.users, gerenciada pelo próprio Supabase.

Coluna	Tipo	Descrição
id	bigint	Chave primária
user_id	uuid	Dono do favorito (referencia auth.users)
tvmaze_id	integer	Id do título na TVMaze
nome	text	Nome do filme ou série
ano	text	Ano de estreia
nota	numeric(3,1)	Nota média
poster_url	text	Endereço da capa
plataforma	text	Emissora ou streaming
criado_em	timestamptz	Data em que foi favoritado

Existe uma restrição UNIQUE (user_id, tvmaze_id) para impedir favoritos duplicados. O script completo, com as políticas de RLS, está em schema.sql.

🐳 Executando com Docker
Direto do Docker Hub
bash
docker run -d -p 8080:80 --name ondepassa luscass_DOCKERHUB/ondepassa:latest

Acesse http://localhost:8080.

Tags disponíveis:

Tag	Descrição
1.0	Primeira versão funcional (busca, favoritos e login)
1.1	Nginx com compressão gzip, cache de CSS/JS e healthcheck
latest	Versão mais recente (atualmente 1.1)
A partir do código-fonte
bash
git clone https://github.com/lucassntss059-glitch/bootcamp2-app.git
cd bootcamp2-app
docker compose up -d --build

Para parar e remover o container: docker compose down.

📁 Estrutura do Projeto
bootcamp2-app/
├── index.html           # Estrutura da página, modais e abas
├── style.css            # Estilos e tema escuro
├── script.js            # Lógica: busca, favoritos, login e Supabase
├── schema.sql           # Tabela e políticas de segurança do banco
├── nginx.conf           # Configuração do servidor (gzip e cache)
├── Dockerfile           # Imagem Docker do site
├── docker-compose.yml   # Execução com um comando
└── .dockerignore        # Arquivos ignorados no build da imagem
## Github: https://github.com/lucassntss059-glitch/bootcamp2-app.git
## Pages:  https://lucassntss059-glitch.github.io/bootcamp2-app/


 
