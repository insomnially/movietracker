const path = require("path");
const express = require("express");
const app = require("./server.cjs");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");

app.use("/posters2", express.static(path.join(publicDir, "posters2")));
app.use("/series_posters", express.static(path.join(publicDir, "series_posters")));
app.use("/anime_posters", express.static(path.join(publicDir, "anime_posters")));
app.use("/uploads", express.static(path.join(publicDir, "uploads")));

app.use(express.static(distDir));

app.use((req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "Route not found" });
    }

    res.sendFile(path.join(distDir, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});