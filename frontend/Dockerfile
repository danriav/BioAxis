FROM node:20-alpine

WORKDIR /app

# Instalamos dependencias primero para aprovechar el cache de Docker
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de Next.js
EXPOSE 3000

# Arrancamos en modo desarrollo
CMD ["npm", "run", "dev"]