export const legalWatchServices = [
    {
        id: "kinopoisk",
        title: "Кинопоиск",
        logo: "/public/watch-services/kinopoisk-logo.svg",
        buildUrl: (title) => `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(title)}`
    },
    {
        id: "ivi",
        title: "Иви",
        logo: "/public/watch-services/ivi-logo.svg",
        buildUrl: (title) => `https://www.ivi.tv/search/?q=${encodeURIComponent(title)}`
    },
    {
        id: "youtube",
        title: "YouTube",
        logo: "/public/watch-services/youtube-logo.svg",
        buildUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} смотреть`)}`
    },
    {
        id: "vk_video",
        title: "VK Видео",
        logo: "/public/watch-services/vkvideo-logo.svg",
        buildUrl: (title) => `https://vkvideo.ru/search?q=${encodeURIComponent(`${title} смотреть`)}`
    },
    {
        id: "rutube",
        title: "RUTUBE",
        logo: "/public/watch-services/rutube-logo.svg",
        buildUrl: (title) => `https://rutube.ru/search/?query=${encodeURIComponent(`${title} смотреть`)}`
    }
];

export const getLegalWatchLinks = (item) => {
    const title = item?.title || item?.name || item?.original_title || item?.original_name || "";

    if (!title) {
        return [];
    }

    return legalWatchServices.map((service) => ({
        id: service.id,
        title: service.title,
        logo: service.logo,
        url: service.buildUrl(title)
    }));
};