# NexMeet — P2P Видеозвонки

Сервис видеозвонков на WebRTC + Socket.io. Сигнализация через собственный Node.js-сервер,
медиа передаётся **напрямую P2P** между браузерами (DTLS-шифрование из коробки).

## Архитектура

```
Браузер A  ──signal──▶  Node.js сервер (Socket.io)  ◀──signal──  Браузер B
    │                        (только сигнализация)                      │
    └────────────────── WebRTC P2P медиапоток ──────────────────────────┘
```

Сервер **не трогает** аудио/видео. Он только помогает браузерам найти друг друга
(обмен SDP offer/answer и ICE-кандидатами). После этого медиа идёт напрямую.

## Быстрый старт

### Требования
- Node.js 18+ (проверить: `node -v`)
- npm (входит в Node.js)

### 1. Установить зависимости

```bash
cd nexmeet
npm install
```

### 2. Запустить сервер

```bash
npm start
```

Откроется: **http://localhost:3000**

### 3. Протестировать локально

Откройте **два разных окна** (или браузера) на `http://localhost:3000`.
В первом нажмите «Создать комнату» → войдите. Скопируйте ссылку и вставьте во второе окно.

> **Chrome/Edge**: `localhost` работает без HTTPS.  
> **Firefox**: тоже работает на localhost.  
> **Мобильный телефон в той же сети**: используйте IP компьютера, например `http://192.168.1.X:3000`

---

## Деплой в интернет (чтобы звонить с разных сетей)

### Вариант A — Railway (бесплатно, 5 минут)

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. Нажмите **New Project → Deploy from GitHub**
3. Загрузите папку `nexmeet` в GitHub-репозиторий
4. Railway автоматически запустит `npm start`
5. Получите публичный URL вида `https://nexmeet-xxx.railway.app`

### Вариант B — Render (бесплатно)

1. [render.com](https://render.com) → New → Web Service
2. Подключите GitHub-репо с папкой nexmeet
3. Build command: `npm install`  
   Start command: `npm start`
4. Получите URL и пользуйтесь

### Вариант C — VPS/сервер

```bash
# На сервере:
git clone <ваш-репо> nexmeet
cd nexmeet
npm install
npm install -g pm2
pm2 start server.js --name nexmeet
pm2 save

# Nginx proxy (чтобы работало на 443/HTTPS):
# location / { proxy_pass http://localhost:3000; proxy_http_version 1.1;
#              proxy_set_header Upgrade $http_upgrade;
#              proxy_set_header Connection "upgrade"; }
```

> **Важно**: HTTPS обязателен для доступа к камере/микрофону на реальных доменах
> (кроме localhost). Railway и Render дают HTTPS бесплатно автоматически.

---

## Возможности

| Функция | Статус |
|---|---|
| Видео/аудио звонок | ✅ |
| До 6 участников в комнате | ✅ |
| Демонстрация экрана | ✅ |
| Текстовый чат | ✅ |
| Отключить микрофон/камеру | ✅ |
| Ссылка-приглашение | ✅ |
| Адаптив (мобайл) | ✅ |
| P2P шифрование (DTLS) | ✅ |
| Запись звонка | — |
| Виртуальный фон | — |

## Разработка (авторестарт)

```bash
npm run dev
```

Требует `nodemon`: `npm install -g nodemon`
