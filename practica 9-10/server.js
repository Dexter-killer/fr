const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 3000;
const JWT_SECRET = "super_secret_key_123";
const REFRESH_SECRET = "super_refresh_secret_123";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// Настройка папки для загрузки файлов (для сайта с винилами)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

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

app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));
app.use(express.json());

// Отдача статики
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static('public'));

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ==========================================
// БАЗЫ ДАННЫХ (В ПАМЯТИ)
// ==========================================
// Для тестирования 11 практики добавим дефолтного админа: admin@test.com / admin123
let users = [
    { 
        id: 'admin1', 
        email: 'admin@test.com', 
        first_name: 'Super', 
        last_name: 'Admin', 
        // Хеш пароля "admin123"
        password: '$2b$10$wE4S5y2J4E2NlB/Jz/oR.OGH.K.b8oU35c4mC71A.K0uN1I5I7A.m', 
        role: 'admin' 
    },
    { 
        id: 'seller1', 
        email: 'seller@test.com', 
        first_name: 'Best', 
        last_name: 'Seller', 
        // Хеш пароля "seller123"
        password: '$2b$10$2l0F.3YxJ8R9R8T/2G7pI.oA.gG7R.W7D8l.mXk2M/0C.R8v.O2eW', 
        role: 'seller' 
    }
];

let products = [
    { id: '101', title: 'Pink Floyd - Echoes', category: 'Vinyl', description: 'Classic rock album', price: 4200 },
    { id: '102', title: 'The Doors - L.A. Woman', category: 'Vinyl', description: 'Blues rock masterpiece', price: 3800 }
];
const refreshTokens = new Set();

let vinyls = [
    { id: '101', title: 'Pink Floyd - Echoes', price: 4200, image: '/uploads/pink_floyd.jpg' },
    { id: '102', title: 'The Doors - L.A. Woman', price: 3800, image: '/uploads/the_doors.webp' },
    { id: '103', title: 'Led Zeppelin IV', price: 4500, image: '/uploads/led_zeppelin.jpg' },
    { id: '104', title: 'The Beatles - Abbey Road', price: 4000, image: '/uploads/The Beatles - Abbey Road.webp' },
    { id: '105', title: 'Queen - A Night at the Opera', price: 3500, image: '/uploads/Queen - A Night at the Opera.webp' },
    { id: '106', title: 'David Bowie - Ziggy Stardust', price: 4800, image: '/uploads/David Bowie - Ziggy Stardust.webp' },
    { id: '107', title: 'Nirvana - Nevermind', price: 3200, image: '/uploads/Nirvana - Nevermind.webp' },
    { id: '108', title: 'Radiohead - OK Computer', price: 4100, image: '/uploads/Radiohead - OK Computer.webp' },
    { id: '109', title: 'Michael Jackson - Thriller', price: 3900, image: '/uploads/Michael Jackson - Thriller.webp' },
    { id: '110', title: 'Daft Punk - Random Access Memories', price: 5000, image: '/uploads/Daft Punk - Random Access Memories.webp' }
];

// ==========================================
// SWAGGER НАСТРОЙКИ
// ==========================================
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { 
            title: 'API магазина пластинок + Практика 11 (RBAC)', 
            version: '1.0.0',
            description: 'API с авторизацией и ролями (user, seller, admin).'
        },
        servers: [{ url: `http://localhost:${PORT}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        }
    },
    apis: [path.join(__dirname, 'server.js')],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// MIDDLEWARES (Практика 8 и 11)
// ==========================================
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Отсутствует или некорректный токен (ожидается Bearer <token>)" });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; 
        next();
    } catch (err) {
        return res.status(401).json({ error: "Токен недействителен или истек" });
    }
}

function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: Недостаточно прав" });
        }
        next();
    };
}

// ==========================================
// ГЕНЕРАЦИЯ ТОКЕНОВ (Практика 9 + Роли из 11)
// ==========================================
function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

// ==========================================
// МАРШРУТЫ АВТОРИЗАЦИИ
// ==========================================
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 */
app.post("/api/auth/register", async (req, res) => {
    const { email, first_name, last_name, password, role } = req.body;
    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: "Все поля обязательны" });
    }
    if (users.find(u => u.email === email)) return res.status(409).json({ error: "Пользователь уже существует" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { 
        id: nanoid(), 
        email, 
        first_name, 
        last_name, 
        password: hashedPassword,
        role: role || 'user' // По умолчанию user
    };
    users.push(newUser);
    
    const { password: _, ...userResponse } = newUser;
    res.status(201).json(userResponse);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 */
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Неверный логин или пароль" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Неверный логин или пароль" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);
    res.json({ accessToken, refreshToken, user: { role: user.role } });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     tags: [Auth]
 */
app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) return res.status(401).json({ error: "Невалидный refresh токен" });

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = users.find(u => u.id === payload.sub);
        if (!user) return res.status(401).json({ error: "Пользователь не найден" });

        refreshTokens.delete(refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.add(newRefreshToken);
        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        return res.status(401).json({ error: "Токен истек или невалиден" });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение данных текущего пользователя (Любая роль)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    const { password, ...userResponse } = user;
    // Явно добавляем роль, на случай если ее там нет
    userResponse.role = user.role || 'user';
    res.json(userResponse);
});

// ==========================================
// УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (ТОЛЬКО ADMIN)
// ==========================================
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список пользователей (Только Admin)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
app.get("/api/users", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
});

app.get("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Не найден" });
    const { password, ...u } = user;
    res.json(u);
});

app.put("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Не найден" });
    users[index] = { ...users[index], ...req.body, id: req.params.id };
    const { password, ...u } = users[index];
    res.json(u);
});

app.delete("/api/users/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    res.status(204).send();
});

// ==========================================
// МАРШРУТЫ PRODUCTS
// ==========================================
app.get("/api/products", authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => res.json(products));
app.get("/api/products/:id", authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    product ? res.json(product) : res.status(404).json({ error: "Не найден" });
});
app.post("/api/products", authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const newProduct = { id: nanoid(), ...req.body };
    products.push(newProduct);
    res.status(201).json(newProduct);
});
app.put("/api/products/:id", authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Не найден" });
    products[index] = { ...products[index], ...req.body, id: req.params.id };
    res.json(products[index]);
});
app.delete("/api/products/:id", authMiddleware, roleMiddleware(['admin']), (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.status(204).send();
});


// ==========================================
// МАРШРУТЫ VINYLS ДЛЯ РАБОТЫ ФРОНТЕНДА ИЗ PRACTICA 2
// Добавим роли, чтобы фронтенд мог тестировать функционал
// ==========================================
// GET доступен всем авторизованным (user, seller, admin)
app.get('/api/vinyls', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    res.json(vinyls);
});

// POST доступен продавцам и админам
app.post('/api/vinyls', authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), (req, res) => {
    const { title, price } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Нужны title и price' });
    let imagePath = 'https://via.placeholder.com/150';
    if (req.file) imagePath = `/uploads/${req.file.filename}`;
    const newItem = { id: nanoid(6), title, price: Number(price), image: imagePath };
    vinyls.push(newItem);
    res.status(201).json(newItem);
});

// GET по id доступен всем авторизованным
app.get('/api/vinyls/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
    const vinyl = vinyls.find(v => v.id === req.params.id || v.id === Number(req.params.id));
    vinyl ? res.json(vinyl) : res.status(404).json({ error: "Vinyl not found" });
});

// PUT доступен продавцам и админам
app.put('/api/vinyls/:id', authMiddleware, roleMiddleware(['seller', 'admin']), upload.single('image'), (req, res) => {
    const index = vinyls.findIndex(v => v.id === req.params.id || v.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: "Vinyl not found" });
    
    const { title, price } = req.body;
    let imagePath = vinyls[index].image;
    if (req.file) imagePath = `/uploads/${req.file.filename}`;
    
    vinyls[index] = { 
        ...vinyls[index], 
        title: title || vinyls[index].title, 
        price: price ? Number(price) : vinyls[index].price, 
        image: imagePath 
    };
    res.json(vinyls[index]);
});

// DELETE доступен только админам
app.delete('/api/vinyls/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
    const initialLength = vinyls.length;
    vinyls = vinyls.filter(v => v.id !== req.params.id && v.id !== Number(req.params.id));
    if (vinyls.length === initialLength) return res.status(404).json({ error: "Vinyl not found" });
    res.status(204).send();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`СЕРВЕР УСПЕШНО ЗАПУЩЕН! Порт: ${PORT}`);
    console.log(`Основной сайт: http://localhost:${PORT}`);
    console.log(`Swagger (Документация и тест API): http://localhost:${PORT}/api-docs`);
    console.log(`===========================================`);
});
