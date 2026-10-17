# Estágio 1: Build da aplicação
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copia apenas os arquivos de gerenciamento de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies para compilar o TS)
RUN npm ci

# Copia o restante do código fonte e as configurações do TypeScript
COPY tsconfig.json ./
COPY src/ ./src

# Compila o TypeScript para JavaScript (gera a pasta /dist)
RUN npm run build

# Instala apenas as dependências de produção para reduzir o tamanho final da imagem
RUN npm prune --production

# Estágio 2: Execução em ambiente de produção
FROM node:22-alpine

WORKDIR /usr/src/app

# Copia apenas o código compilado e as dependências de produção do estágio anterior
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Expõe a porta que a API do Fastify escuta
EXPOSE 3000

# O comando padrão será sobrescrito pelo docker-compose dependendo do container
CMD ["node", "dist/api/server.js"]
