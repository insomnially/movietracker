const path = require("path");
const fs = require("fs");
const express = require("express");
const app = require("./server.cjs");

function staticFolder(folderName) {
    const variants = [
        path.join(process.cwd(), "public", folderName),
        path.join(process.cwd(), folderName),
        path.join(__dirname, "..", "public", folderName),
        path.join(__dirname, "..", folderName),
        path.join(__dirname, folderName)
    ];

    const found = variants.find((folderPath) => fs.existsSync(folderPath));

    if (!found) {
        console.log(`STATIC NOT FOUND: ${folderName}`);
        return path.join(process.cwd(), "public", folderName);
    }

    console.log(`STATIC ${folderName}: ${found}`);
    return found;
}

app.use("/posters2", express.static(staticFolder("posters2")));
app.use("/series_posters", express.static(staticFolder("series_posters")));
app.use("/anime_posters", express.static(staticFolder("anime_posters")));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});