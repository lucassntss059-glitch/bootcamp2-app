# Imagem base: servidor Nginx leve (versão Alpine)
FROM nginx:1.27-alpine

# Copia os arquivos do site para a pasta que o Nginx serve
COPY . /usr/share/nginx/html

# O Nginx escuta na porta 80 dentro do container
EXPOSE 80
