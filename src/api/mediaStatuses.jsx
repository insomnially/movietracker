const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function getMediaStatuses(token, status) {
    const params = new URLSearchParams();

    if (status) {
        params.set("status", status);
    }

    const res = await fetch(`${API_URL}/api/media-statuses?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error("Ошибка загрузки статусов");
    }

    return await res.json();
}

export async function saveMediaStatus(token, item, status) {
    const itemKey = item.item_key || `movies:${item.id}`;

    const res = await fetch(`${API_URL}/api/media-statuses`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            item_key: itemKey,
            media_id: item.id || item.media_id || null,
            section: item.section || "movies",
            media_type: item.media_type || "movie",
            status,
            title: item.title,
            original_title: item.original_title || null,
            poster_local: item.poster_local || item.poster_path || item.poster || null,
            rating: item.rating || item.vote_average || 0,
            year: item.year || item.release_date?.slice(0, 4) || null,
            genres: item.genres || null
        })
    });

    if (!res.ok) {
        throw new Error("Ошибка сохранения статуса");
    }

    return await res.json();
}

export async function deleteMediaStatus(token, itemKey) {
    const res = await fetch(`${API_URL}/api/media-statuses/${encodeURIComponent(itemKey)}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error("Ошибка удаления статуса");
    }

    return await res.json();
}