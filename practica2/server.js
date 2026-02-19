const express = require('express');
const path = require('path');
const cors = require('cors'); // ЭТО ВАЖНО: Разрешает React-у общаться с сервером
const { nanoid } = require('nanoid'); // Генерирует уникальные ID

const app = express();
const PORT = 5050;

// Разрешаем запросы с любых сайтов (чтобы React с localhost:3000 мог достучаться)
app.use(cors());
app.use(express.json());

// Логирование (полезно видеть, какие запросы прилетают)
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Начальные данные (как у тебя было, но ID теперь строковые для единообразия)
let vinyls = [
    { id: '101', title: 'Pink Floyd - Echoes', price: 4200 },
    { id: '102', title: 'The Doors - L.A. Woman', price: 3800 },
    { id: '103', title: 'Led Zeppelin IV', price: 4500 }
];

// 1. Получить все пластинки
app.get('/api/vinyls', (req, res) => {
    res.json(vinyls);
});

// 2. Добавить пластинку
app.post('/api/vinyls', (req, res) => {
    const { title, price } = req.body;
    
    // Проверка, что данные прислали корректно
    if (!title || !price) {
        return res.status(400).json({ error: 'Нужны title и price' });
    }

    const newItem = {
        id: nanoid(6), // Генерируем красивый ID из 6 символов
        title: title,
        price: Number(price)
    };
    
    vinyls.push(newItem);
    res.status(201).json(newItem);
});

// 3. Удалить пластинку (ЭТОГО У ТЕБЯ НЕ БЫЛО, А В ЗАДАНИИ НУЖНО)
app.delete('/api/vinyls/:id', (req, res) => {
    const id = req.params.id;
    // Оставляем только те пластинки, у которых ID НЕ совпадает с удаляемым
    vinyls = vinyls.filter(v => v.id !== id && v.id !== Number(id)); // проверка и на строку и на число
    res.status(204).send(); // 204 = Успешно, но без контента
});

// Главная страница (заглушка)
app.get('/', (req, res) => {
    res.send('Vinyl Server is Running! Go to /api/vinyls');
});

app.listen(PORT, () => {
    console.log(`VINYL_SERVER_ACTIVE: http://localhost:${PORT}`);
});
