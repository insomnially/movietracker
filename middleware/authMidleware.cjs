const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Не авторизован" });
    }

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email
        };

        if (!req.user.id) {
            return res.status(401).json({ message: "Некорректный токен" });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: "Недействительный токен" });
    }
}

module.exports = authMiddleware;