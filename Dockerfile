# Используем базовый образ Node.js на Alpine Linux
FROM node:19.5.0-alpine

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Копируем папку prisma заранее, до установки зависимостей
COPY prisma ./prisma

# Устанавливаем зависимости (выполнит postinstall с prisma generate)
RUN npm install

# Копируем остальной исходный код
COPY . .

# Устанавливаем Prisma CLI глобально (опционально, если используешь в ручном режиме)
RUN npm install -g prisma

# Повторно генерируем Prisma Client (можно удалить, если postinstall уже это делает)
RUN prisma generate

# Открываем порт
EXPOSE 3000

# Запускаем сервер
CMD ["npm", "start"]