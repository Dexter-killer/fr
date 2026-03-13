const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 5050;

// Настройка папки для загрузки файлов
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

let vinyls = [
    { id: '101', title: 'Pink Floyd - Echoes', price: 4200, image: '/uploads/pink_floyd.jpg' },
    { id: '102', title: 'The Doors - L.A. Woman', price: 3800, image: '/uploads/the_doors.webp' },
    { id: '103', title: 'Led Zeppelin IV', price: 4500, image: '/uploads/led_zeppelin.jpg' }
];

// Описание Swagger (упрощено)
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'API магазина пластинок', version: '1.0.0' },
        servers: [{ url: `http://localhost:${PORT}` }],
    },
    apis: [path.join(__dirname, 'server.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/vinyls:
 *   get:
 *     summary: Получить список всех пластинок
 *     responses:
 *       200:
 *         description: Успешный ответ со списком пластинок
 */
app.get('/api/vinyls', (req, res) => {
    res.json(vinyls);
});

/**
 * @swagger
 * /api/vinyls:
 *   post:
 *     summary: Добавить пластинку (с загрузкой файла)
 *     responses:
 *       201:
 *         description: Пластинка успешно добавлена
 *       400:
 *         description: Ошибка валидации (отсутствуют title или price)
 */
app.post('/api/vinyls', upload.single('image'), (req, res) => {
    const { title, price } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Нужны title и price' });
    }

    let imagePath = 'https://via.placeholder.com/150';
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    const newItem = {
        id: nanoid(6),
        title: title,
        price: Number(price),
        image: imagePath
    };
    
    vinyls.push(newItem);
    res.status(201).json(newItem);
});

/**
 * @swagger
 * /api/vinyls/{id}:
 *   delete:
 *     summary: Удалить пластинку
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пластинки
 *     responses:
 *       204:
 *         description: Пластинка успешно удалена
 *       404:
 *         description: Пластинка не найдена
 */
app.delete('/api/vinyls/:id', (req, res) => {
    const id = req.params.id;
    const initialLength = vinyls.length;
    vinyls = vinyls.filter(v => v.id !== id && v.id !== Number(id));
    
    if (vinyls.length === initialLength) {
        return res.status(404).json({ error: "Vinyl not found" });
    }
    res.status(204).send();
});

app.get('/', (req, res) => {
    res.send('Vinyl Server is Running!');
});

app.listen(PORT, () => {
    console.log(`VINYL_SERVER_ACTIVE: http://localhost:${PORT}`);
});
