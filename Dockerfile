FROM node:20 AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS test
RUN npm test

FROM base AS run
EXPOSE 3000
CMD ["node", "app.js"]
