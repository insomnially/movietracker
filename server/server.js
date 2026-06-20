require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const authRoutes = require("../routes/authRoutes.cjs");
const mediaStatusRoutes = require("../routes/mediaStatusPage.cjs");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false
        }
        : {
            user: process.env.DB_USER || "postgres",
            host: process.env.DB_HOST || "localhost",
            database: process.env.DB_NAME || "movies_db",
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 5432
        }
);

app.use("/api/auth", authRoutes(pool));
app.use("/api/media-statuses", mediaStatusRoutes(pool));

function staticFolder(folderName) {
    const variants = [
        path.join(__dirname, folderName),
        path.join(__dirname, "..", folderName),
        path.join(process.cwd(), folderName)
    ];

    const found = variants.find((folderPath) => fs.existsSync(folderPath));

    if (!found) {
        console.log(`STATIC NOT FOUND: ${folderName}`);
        return path.join(__dirname, folderName);
    }

    console.log(`STATIC ${folderName}: ${found}`);
    return found;
}

app.use("/posters2", express.static(staticFolder("posters2")));
app.use("/series_posters", express.static(staticFolder("series_posters")));
app.use("/anime_posters", express.static(staticFolder("anime_posters")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const avatarDir = path.join(__dirname, "uploads", "avatars");

if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Можно загружать только изображения"));
        }

        cb(null, true);
    }
});

const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Нет токена" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Неверный токен" });
    }
}


const normalizePoster = (poster) => {
    if (!poster) return null;

    let cleanPoster = String(poster).replace(/\\/g, "/");

    if (cleanPoster.startsWith("/")) {
        cleanPoster = cleanPoster.slice(1);
    }

    if (cleanPoster.startsWith("http")) {
        return cleanPoster;
    }

    if (cleanPoster.startsWith("posters2/")) {
        return cleanPoster;
    }

    return `posters2/${cleanPoster}`;
};



const mapMovie = (m) => ({
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    overview: m.overview,
    release_date: m.release_date,
    year: m.year || (m.release_date ? new Date(m.release_date).getFullYear() : null),
    rating: m.rating,
    vote_count: m.vote_count,
    budget: m.budget,
    revenue: m.revenue,
    runtime: m.runtime,
    genres: m.genres,
    language: m.language || m.original_language,
    adult: m.adult,
    poster_local: normalizePoster(m.poster_local),
    trailer_youtube: m.trailer_youtube,
    trailer_embed: m.trailer_embed,
});

const genreMap = {
    28: ["Action", "Боевик"],
    35: ["Comedy", "Комедия"],
    18: ["Drama", "Драма"],
    27: ["Horror", "Ужасы"],
};

const buildMoviesQuery = (req) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = (page - 1) * limit;

    const search = (req.query.query || "").trim();
    const genre = (req.query.genre || "").trim();
    const rating = Number(req.query.rating);
    const year = Number(req.query.year);
    const yearFrom = Number(req.query.yearFrom);
    const yearTo = Number(req.query.yearTo);
    const sort = String(req.query.sort || "rating_desc");
    const hasTrailer = String(req.query.hasTrailer || "") === "1";

    const where = [];
    const values = [];

    if (search) {
        values.push(`%${search}%`);
        where.push(`(title ILIKE $${values.length} OR original_title ILIKE $${values.length})`);
    }

    if (genre) {
        const genres = genreMap[genre] || genre
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean);

        const genreConditions = [];

        genres.forEach((g) => {
            values.push(`%${g}%`);
            genreConditions.push(`genres ILIKE $${values.length}`);
        });

        if (genreConditions.length > 0) {
            where.push(`(${genreConditions.join(" OR ")})`);
        }
    }

    if (!Number.isNaN(rating) && rating > 0) {
        values.push(rating);
        where.push(`rating >= $${values.length}`);
    }

    if (!Number.isNaN(year) && year > 0) {
        values.push(year);
        where.push(`year = $${values.length}`);
    }

    if (!Number.isNaN(yearFrom) && yearFrom > 0) {
        values.push(yearFrom);
        where.push(`year >= $${values.length}`);
    }

    if (!Number.isNaN(yearTo) && yearTo > 0) {
        values.push(yearTo);
        where.push(`year <= $${values.length}`);
    }

    if (hasTrailer) {
        where.push(`trailer_embed IS NOT NULL AND trailer_embed <> ''`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    values.push(limit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    return {
        page,
        limit,
        values,
        whereSql,
        limitIndex,
        offsetIndex,
        sort
    };
};

const catalogQueries = {
    movies: `
        SELECT
            id::TEXT AS id,
            ('movies:' || id::TEXT) AS item_key,
            id AS tmdb_id,
            'movies' AS section,
            'movie' AS media_type,
            title,
            original_title,
            overview,
            release_date,
            NULL::DATE AS first_air_date,
            NULL::DATE AS last_air_date,
            year,
            rating,
            vote_count,
            NULL::DOUBLE PRECISION AS popularity,
            budget,
            revenue,
            runtime,
            NULL::INTEGER AS number_of_seasons,
            NULL::INTEGER AS number_of_episodes,
            NULL::TEXT AS episode_run_time,
            genres,
            language,
            NULL::TEXT AS origin_country,
            NULL::TEXT AS status,
            NULL::TEXT AS tv_type,
            NULL::TEXT AS networks,
            NULL::TEXT AS production_companies,
            adult,
            poster_local,
            trailer_youtube,
            trailer_embed
        FROM movies
    `,
    series: `
        SELECT
            id::TEXT AS id,
            ('series:' || id::TEXT) AS item_key,
            id AS tmdb_id,
            'series' AS section,
            'tv' AS media_type,
            name AS title,
            original_name AS original_title,
            overview,
            NULL::DATE AS release_date,
            first_air_date,
            last_air_date,
            first_air_year AS year,
            rating,
            vote_count,
            popularity,
            NULL::BIGINT AS budget,
            NULL::BIGINT AS revenue,
            NULL::INTEGER AS runtime,
            number_of_seasons,
            number_of_episodes,
            episode_run_time,
            genres,
            language,
            origin_country,
            status,
            tv_type,
            networks,
            production_companies,
            adult,
            poster_local,
            trailer_youtube,
            trailer_embed
        FROM series
    `,
    anime: `
        SELECT
            COALESCE(tmdb_id::TEXT, media_key) AS id,
            ('anime:' || COALESCE(tmdb_id::TEXT, media_key)) AS item_key,
            tmdb_id,
            'anime' AS section,
            media_type,
            title,
            original_title,
            overview,
            release_date,
            first_air_date,
            last_air_date,
            year,
            rating,
            vote_count,
            popularity,
            budget,
            revenue,
            runtime,
            number_of_seasons,
            number_of_episodes,
            episode_run_time,
            genres,
            language,
            origin_country,
            status,
            tv_type,
            networks,
            production_companies,
            adult,
            poster_local,
            trailer_youtube,
            trailer_embed
        FROM anime
    `
};

app.get("/api/movies", async (req, res) => {
    try {
        const {
            page,
            limit,
            values,
            whereSql,
            limitIndex,
            offsetIndex,
            sort
        } = buildMoviesQuery(req);

        const sortMap = {
            rating_desc: "rating DESC NULLS LAST, vote_count DESC NULLS LAST",
            rating_asc: "rating ASC NULLS LAST, vote_count DESC NULLS LAST",
            year_desc: "year DESC NULLS LAST, rating DESC NULLS LAST",
            year_asc: "year ASC NULLS LAST, rating DESC NULLS LAST",
            popular_desc: "vote_count DESC NULLS LAST, rating DESC NULLS LAST",
            title_asc: "title ASC NULLS LAST"
        };

        const orderSql = sortMap[sort] || sortMap.rating_desc;

        const result = await pool.query(
            `
            SELECT *
            FROM movies
            ${whereSql}
            ORDER BY ${orderSql}, id DESC
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
            `,
            values
        );

        const countValues = values.slice(0, values.length - 2);

        const count = await pool.query(
            `
            SELECT COUNT(*)
            FROM movies
            ${whereSql}
            `,
            countValues
        );

        res.json({
            results: result.rows.map(mapMovie),
            total: Number(count.rows[0].count),
            page,
            limit,
            totalPages: Math.ceil(Number(count.rows[0].count) / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "MOVIES ERROR" });
    }
});

app.get("/api/search", async (req, res) => {
    try {
        const q = (req.query.query || "").trim();

        if (!q) {
            return res.json({
                results: [],
                total: 0,
                page: 1,
                limit: 50,
                totalPages: 0,
            });
        }

        req.query.page = req.query.page || "1";
        req.query.limit = req.query.limit || "50";

        const {
            page,
            limit,
            values,
            whereSql,
            limitIndex,
            offsetIndex,
        } = buildMoviesQuery(req);

        const result = await pool.query(
            `
            SELECT *
            FROM movies
            ${whereSql}
            ORDER BY rating DESC NULLS LAST, id DESC
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
            `,
            values
        );

        const countValues = values.slice(0, values.length - 2);

        const count = await pool.query(
            `
            SELECT COUNT(*)
            FROM movies
            ${whereSql}
            `,
            countValues
        );

        res.json({
            results: result.rows.map(mapMovie),
            total: Number(count.rows[0].count),
            page,
            limit,
            totalPages: Math.ceil(Number(count.rows[0].count) / limit),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "SEARCH ERROR" });
    }
});

app.get("/api/movie/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "INVALID ID" });
        }

        const result = await pool.query(
            `
            SELECT *
            FROM movies
            WHERE id = $1
            `,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "NOT FOUND" });
        }

        res.json(mapMovie(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "MOVIE ERROR" });
    }
});

app.get("/api/catalog/:section", async (req, res) => {
    try {
        const section = req.params.section;

        if (!catalogQueries[section]) {
            return res.status(400).json({ error: "Unknown catalog section" });
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 60);
        const offset = (page - 1) * limit;

        const search = String(req.query.search || "").trim();
        const genre = String(req.query.genre || "").trim();
        const rating = Number(req.query.rating);
        const yearFrom = Number(req.query.yearFrom);
        const yearTo = Number(req.query.yearTo);
        const sort = String(req.query.sort || "rating_desc");
        const hasTrailer = String(req.query.hasTrailer || "") === "1";
        const mediaType = String(req.query.mediaType || "").trim();

        const baseQuery = catalogQueries[section];

        const where = [];
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            where.push(`(
                title ILIKE $${params.length}
                OR original_title ILIKE $${params.length}
                OR genres ILIKE $${params.length}
            )`);
        }

        if (genre) {
        const genreVariants = genre
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean);

        if (genreVariants.length > 0) {
            const genreConditions = [];

            genreVariants.forEach((genreVariant) => {
                params.push(`%${genreVariant}%`);
                genreConditions.push(`genres ILIKE $${params.length}`);
            });

            where.push(`(${genreConditions.join(" OR ")})`);
        }
    }

        if (!Number.isNaN(rating) && rating > 0) {
            params.push(rating);
            where.push(`rating >= $${params.length}`);
        }

        if (!Number.isNaN(yearFrom) && yearFrom > 0) {
            params.push(yearFrom);
            where.push(`year >= $${params.length}`);
        }

        if (!Number.isNaN(yearTo) && yearTo > 0) {
            params.push(yearTo);
            where.push(`year <= $${params.length}`);
        }

        if (hasTrailer) {
            where.push(`trailer_embed IS NOT NULL AND trailer_embed <> ''`);
        }

        if (section === "anime" && mediaType) {
            params.push(mediaType);
            where.push(`media_type = $${params.length}`);
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const sortMap = {
            rating_desc: "rating DESC NULLS LAST, vote_count DESC NULLS LAST",
            rating_asc: "rating ASC NULLS LAST, vote_count DESC NULLS LAST",
            year_desc: "year DESC NULLS LAST, rating DESC NULLS LAST",
            year_asc: "year ASC NULLS LAST, rating DESC NULLS LAST",
            popular_desc: "popularity DESC NULLS LAST, vote_count DESC NULLS LAST",
            title_asc: "title ASC NULLS LAST"
        };

        const orderSql = sortMap[sort] || sortMap.rating_desc;

        const itemsParams = [...params, limit, offset];
        const limitIndex = itemsParams.length - 1;
        const offsetIndex = itemsParams.length;

        const itemsResult = await pool.query(
            `
            SELECT *
            FROM (${baseQuery}) catalog
            ${whereSql}
            ORDER BY ${orderSql}
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
            `,
            itemsParams
        );

        const countResult = await pool.query(
            `
            SELECT COUNT(*)
            FROM (${baseQuery}) catalog
            ${whereSql}
            `,
            params
        );

        res.json({
            results: itemsResult.rows,
            total: Number(countResult.rows[0].count),
            page,
            limit,
            totalPages: Math.ceil(Number(countResult.rows[0].count) / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Catalog error" });
    }
});

app.get("/api/catalog/:section/:id", async (req, res) => {
    try {
        const { section, id } = req.params;

        if (!catalogQueries[section]) {
            return res.status(400).json({ message: "Некорректный раздел" });
        }

        const baseQuery = catalogQueries[section];
        const normalizedKey = `${section}:${id}`;

        const result = await pool.query(
            `
            SELECT *
            FROM (${baseQuery}) catalog
            WHERE 
                catalog.item_key = $1
                OR catalog.item_key = $2
                OR catalog.id::TEXT = $1
                OR catalog.tmdb_id::TEXT = $1
            LIMIT 1
            `,
            [id, normalizedKey]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Не найдено" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

app.get("/api/user", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, name, email, avatar_url 
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

app.put("/api/user/avatar", authMiddleware, uploadAvatar.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Файл не загружен" });
        }

        const userId = req.user.id;
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const result = await pool.query(
            `UPDATE users
             SET avatar_url = $1
             WHERE id = $2
             RETURNING id, name, email, avatar_url`,
            [avatarUrl, userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при загрузке аватарки" });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});