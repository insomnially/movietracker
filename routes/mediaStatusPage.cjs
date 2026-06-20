const express = require("express");
const authMiddleware = require("../middleware/authMidleware.cjs");

const router = express.Router();

module.exports = (pool) => {
    router.get("/", authMiddleware, async (req, res) => {
        try {
            const { status, section } = req.query;

            const params = [req.user.id];
            let where = "WHERE user_id = $1";

            if (status) {
                params.push(status);
                where += ` AND status = $${params.length}`;
            }

            if (section) {
                params.push(section);
                where += ` AND section = $${params.length}`;
            }

            const result = await pool.query(
                `SELECT *
                 FROM user_media_statuses
                 ${where}
                 ORDER BY updated_at DESC`,
                params
            );

            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка получения статусов" });
        }
    });

    router.post("/", authMiddleware, async (req, res) => {
        try {
            const {
                item_key,
                media_id,
                section,
                media_type,
                status
            } = req.body;

            if (!item_key || !section || !status) {
                return res.status(400).json({ message: "Не хватает данных" });
            }

            const allowed = ["favorite", "watching", "watched", "dropped"];

            if (!allowed.includes(status)) {
                return res.status(400).json({ message: "Неверный статус" });
            }

            const result = await pool.query(
                `INSERT INTO user_media_statuses
                    (user_id, item_key, media_id, section, media_type, status, updated_at)
                 VALUES
                    ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (user_id, item_key)
                 DO UPDATE SET
                    status = EXCLUDED.status,
                    section = EXCLUDED.section,
                    media_type = EXCLUDED.media_type,
                    media_id = EXCLUDED.media_id,
                    updated_at = NOW()
                 RETURNING *`,
                [
                    req.user.id,
                    item_key,
                    media_id || null,
                    section,
                    media_type || null,
                    status
                ]
            );

            res.json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка сохранения статуса" });
        }
    });

    router.delete("/:itemKey", authMiddleware, async (req, res) => {
        try {
            await pool.query(
                "DELETE FROM user_media_statuses WHERE user_id = $1 AND item_key = $2",
                [req.user.id, req.params.itemKey]
            );

            res.json({ message: "Статус удалён" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка удаления статуса" });
        }
    });

    return router;
};