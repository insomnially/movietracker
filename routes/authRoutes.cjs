const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");

const router = express.Router();

module.exports = (pool) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    router.post("/register", async (req, res) => {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ message: "Заполни все поля" });
            }

            if (password.length < 6) {
                return res.status(400).json({ message: "Пароль должен быть минимум 6 символов" });
            }

            const existing = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

            if (existing.rows.length > 0) {
                return res.status(409).json({ message: "Такой email уже зарегистрирован" });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const result = await pool.query(
                `INSERT INTO users (name, email, password_hash)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, email`,
                [name, email, passwordHash]
            );

            const user = result.rows[0];

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

            res.json({
                token,
                user
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка регистрации" });
        }
    });

    router.post("/login", async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Введи email и пароль" });
            }

            const result = await pool.query(
                "SELECT id, name, email, password_hash FROM users WHERE email = $1",
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ message: "Неверный email или пароль" });
            }

            const user = result.rows[0];

            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                return res.status(401).json({ message: "Неверный email или пароль" });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка входа" });
        }
    });

    router.get("/me", async (req, res) => {
        try {
            const header = req.headers.authorization;

            if (!header || !header.startsWith("Bearer ")) {
                return res.status(401).json({ message: "Не авторизован" });
            }

            const token = header.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const result = await pool.query(
                "SELECT id, name, email, created_at FROM users WHERE id = $1",
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Пользователь не найден" });
            }

            res.json(result.rows[0]);
        } catch (error) {
            res.status(401).json({ message: "Не авторизован" });
        }
    });

    router.post("/forgot-password", async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: "Введи email" });
            }

            const userResult = await pool.query(
                "SELECT id, email, name FROM users WHERE email = $1",
                [email]
            );

            if (userResult.rows.length === 0) {
                return res.json({ message: "Если email существует, письмо отправлено" });
            }

            const user = userResult.rows[0];

            const token = crypto.randomBytes(32).toString("hex");
            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

            const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

            await pool.query(
                `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`,
                [user.id, tokenHash, expiresAt]
            );

            const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

            await resend.emails.send({
                from: process.env.RESEND_FROM,
                to: user.email,
                subject: "Восстановление пароля Movie Tracker",
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                        <h2>Восстановление пароля</h2>
                        <p>Привет, ${user.name}.</p>
                        <p>Чтобы сбросить пароль, нажми на кнопку ниже:</p>
                        <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#6c5ce7;color:white;border-radius:10px;text-decoration:none;">Сбросить пароль</a>
                        <p>Ссылка действует 30 минут.</p>
                    </div>
                `
            });

            res.json({ message: "Если email существует, письмо отправлено" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка восстановления пароля" });
        }
    });

    router.post("/reset-password", async (req, res) => {
        try {
            const { token, password } = req.body;

            if (!token || !password) {
                return res.status(400).json({ message: "Не хватает данных" });
            }

            if (password.length < 6) {
                return res.status(400).json({ message: "Пароль должен быть минимум 6 символов" });
            }

            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

            const tokenResult = await pool.query(
                `SELECT id, user_id
                 FROM password_reset_tokens
                 WHERE token_hash = $1
                 AND used_at IS NULL
                 AND expires_at > NOW()
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [tokenHash]
            );

            if (tokenResult.rows.length === 0) {
                return res.status(400).json({ message: "Ссылка недействительна или устарела" });
            }

            const resetToken = tokenResult.rows[0];
            const passwordHash = await bcrypt.hash(password, 10);

            await pool.query(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                [passwordHash, resetToken.user_id]
            );

            await pool.query(
                "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
                [resetToken.id]
            );

            res.json({ message: "Пароль успешно изменён" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка сброса пароля" });
        }
    });

    return router;
};