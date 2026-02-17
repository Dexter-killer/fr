const express = require('express');
const path = require('path');
const server = express();
const PORT = 5050;

server.use(express.json());
// Раздаем статику из папки public
server.use(express.static(path.join(__dirname, 'public')));

let vinyls = [
    { id: 101, title: 'Pink Floyd - Echoes', price: 4200 },
    { id: 102, title: 'The Doors - L.A. Woman', price: 3800 },
    { id: 103, title: 'Led Zeppelin IV', price: 4500 }
];

// API: Получить всё
server.get('/api/vinyls', (req, res) => {
    res.json(vinyls);
});

// API: Добавить
server.post('/api/vinyls', (req, res) => {
    const { title, price } = req.body;
    const newItem = { id: Date.now(), title, price: Number(price) };
    vinyls.push(newItem);
    res.status(201).json(newItem);
});

// Главная страница (чтобы не было Cannot GET /)
server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`VINYL_SERVER_ACTIVE: http://localhost:${PORT}`);
});
