FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE process.env.PORT
CMD ["node", "backend.js"]