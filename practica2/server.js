const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 5050;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

let vinyls = [
    { id: '101', title: 'Pink Floyd - Echoes', price: 4200 },
    { id: '102', title: 'The Doors - L.A. Woman', price: 3800 },
    { id: '103', title: 'Led Zeppelin IV', price: 4500 }
];

// Описание основного API для Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API магазина пластинок',
            version: '1.0.0',
            description: 'Простое API для управления каталогом виниловых пластинок',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: ['./server.js'], // Путь к файлу с комментариями
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Подключаем Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Vinyl:
 *       type: object
 *       required:
 *         - title
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный уникальный ID пластинки
 *         title:
 *           type: string
 *           description: Название пластинки и исполнитель
 *         price:
 *           type: integer
 *           description: Цена пластинки
 *       example:
 *         id: "101"
 *         title: "Pink Floyd - Echoes"
 *         price: 4200
 */

/**
 * @swagger
 * /api/vinyls:
 *   get:
 *     summary: Возвращает список всех пластинок
 *     tags: [Vinyls]
 *     responses:
 *       200:
 *         description: Список пластинок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vinyl'
 */
app.get('/api/vinyls', (req, res) => {
    res.json(vinyls);
});

/**
 * @swagger
 * /api/vinyls/{id}:
 *   get:
 *     summary: Получает пластинку по ID
 *     tags: [Vinyls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID пластинки
 *     responses:
 *       200:
 *         description: Данные пластинки
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vinyl'
 *       404:
 *         description: Пластинка не найдена
 */
app.get('/api/vinyls/:id', (req, res) => {
    const vinyl = vinyls.find(v => v.id === req.params.id || v.id === Number(req.params.id));
    if (!vinyl) return res.status(404).json({ error: "Vinyl not found" });
    res.json(vinyl);
});

/**
 * @swagger
 * /api/vinyls:
 *   post:
 *     summary: Добавляет новую пластинку
 *     tags: [Vinyls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Пластинка успешно добавлена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vinyl'
 *       400:
 *         description: Ошибка в запросе (не хватает данных)
 */
app.post('/api/vinyls', (req, res) => {
    const { title, price } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Нужны title и price' });
    }

    const newItem = {
        id: nanoid(6),
        title: title,
        price: Number(price)
    };
    
    vinyls.push(newItem);
    res.status(201).json(newItem);
});

/**
 * @swagger
 * /api/vinyls/{id}:
 *   patch:
 *     summary: Обновляет данные пластинки
 *     tags: [Vinyls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID пластинки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Обновленная пластинка
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vinyl'
 *       400:
 *         description: Нет данных для обновления
 *         404:
 *           description: Пластинка не найдена
 */
app.patch('/api/vinyls/:id', (req, res) => {
    const id = req.params.id;
    const vinyl = vinyls.find(v => v.id === id || v.id === Number(id));
    
    if (!vinyl) return res.status(404).json({ error: "Vinyl not found" });

    if (req.body?.title === undefined && req.body?.price === undefined) {
        return res.status(400).json({ error: "Nothing to update" });
    }

    const { title, price } = req.body;
    if (title !== undefined) vinyl.title = title.trim();
    if (price !== undefined) vinyl.price = Number(price);

    res.json(vinyl);
});

/**
 * @swagger
 * /api/vinyls/{id}:
 *   delete:
 *     summary: Удаляет пластинку
 *     tags: [Vinyls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID пластинки
 *     responses:
 *       204:
 *         description: Пластинка успешно удалена
 *       404:
 *         description: Пластинка не найдена
 */
app.delete('/api/vinyls/:id', (req, res) => {
    const id = req.params.id;
    const exists = vinyls.some(v => v.id === id || v.id === Number(id));
    
    if (!exists) return res.status(404).json({ error: "Vinyl not found" });

    vinyls = vinyls.filter(v => v.id !== id && v.id !== Number(id));
    res.status(204).send();
});

app.get('/', (req, res) => {
    res.send('Vinyl Server is Running! Go to /api/vinyls or /api-docs for documentation.');
});

app.listen(PORT, () => {
    console.log(`VINYL_SERVER_ACTIVE: http://localhost:${PORT}`);
    console.log(`Swagger UI доступен по адресу http://localhost:${PORT}/api-docs`);
});
