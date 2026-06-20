import csv
import os
import re
import time
from pathlib import Path
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_KEY = os.getenv("TMDB_API_KEY", "c60d23df12ac98c67616eb154827dd48")

CSV_FILE = "anime_25k.csv"
POSTER_DIR = Path("anime_posters")

LANGUAGE = "ru-RU"
GENRE_LANGUAGE = "en-US"

MIN_YEAR = 2000
MAX_YEAR = datetime.now().year
MIN_RATING = 5
MIN_VOTE_COUNT = 500
MAX_API_PAGE = 500

ORIGINAL_LANGS = ["ja"]
MEDIA_TYPES = ["movie", "tv"]

POSTER_DIR.mkdir(exist_ok=True)

FIELDS = [
    "media_key",
    "tmdb_id",
    "media_type",
    "title",
    "original_title",
    "overview",
    "release_date",
    "first_air_date",
    "last_air_date",
    "year",
    "rating",
    "vote_count",
    "popularity",
    "budget",
    "revenue",
    "runtime",
    "number_of_seasons",
    "number_of_episodes",
    "episode_run_time",
    "genres",
    "language",
    "origin_country",
    "status",
    "tv_type",
    "networks",
    "production_companies",
    "adult",
    "poster_local",
    "trailer_youtube",
    "trailer_embed"
]

bad_title_re = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]")


def create_session():
    session = requests.Session()

    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        respect_retry_after_header=True
    )

    adapter = HTTPAdapter(max_retries=retry)

    session.mount("https://", adapter)
    session.mount("http://", adapter)

    session.headers.update({
        "User-Agent": "Mozilla/5.0"
    })

    return session


session = create_session()


def api_get(path, **params):
    params["api_key"] = API_KEY
    params.setdefault("language", LANGUAGE)

    url = f"https://api.themoviedb.org/3{path}"

    response = session.get(url, params=params, timeout=25)
    response.raise_for_status()

    return response.json()


def is_valid_title(title):
    if not title:
        return False

    title = title.strip()

    if not title:
        return False

    return not bad_title_re.search(title)


def get_year(date_value):
    if not date_value or len(date_value) < 4:
        return None

    year = date_value[:4]

    if not year.isdigit():
        return None

    return int(year)


def join_names(items):
    return ", ".join(
        item.get("name", "")
        for item in items
        if item.get("name")
    )


def join_list(items):
    return ", ".join(
        str(item)
        for item in items
        if item
    )


def load_written_keys():
    if not os.path.exists(CSV_FILE):
        return set()

    keys = set()

    with open(CSV_FILE, "r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            media_key = row.get("media_key")

            if media_key:
                keys.add(media_key)

    return keys


def need_header():
    return not os.path.exists(CSV_FILE) or os.path.getsize(CSV_FILE) == 0


def get_animation_genre_id(media_type):
    path = f"/genre/{media_type}/list"

    data = api_get(
        path,
        language=GENRE_LANGUAGE
    )

    genres = data.get("genres", [])

    for genre in genres:
        if genre.get("name") == "Animation":
            return genre.get("id")

    raise ValueError(f"Animation genre not found for {media_type}")


def download_poster(poster_path, media_type, tmdb_id):
    if not poster_path:
        return ""

    file_path = POSTER_DIR / f"{media_type}_{tmdb_id}.jpg"

    if file_path.exists() and file_path.stat().st_size > 0:
        return str(file_path).replace("\\", "/")

    url = f"https://image.tmdb.org/t/p/w500{poster_path}"

    try:
        with session.get(url, stream=True, timeout=30) as response:
            if response.status_code != 200:
                return ""

            with open(file_path, "wb") as file:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        file.write(chunk)

        return str(file_path).replace("\\", "/")

    except Exception:
        return ""


def get_trailer(item):
    videos = item.get("videos", {}).get("results", [])

    youtube_videos = [
        video for video in videos
        if video.get("site") == "YouTube" and video.get("key")
    ]

    if not youtube_videos:
        return "", ""

    trailers = [
        video for video in youtube_videos
        if video.get("type") == "Trailer"
    ]

    teasers = [
        video for video in youtube_videos
        if video.get("type") == "Teaser"
    ]

    openings = [
        video for video in youtube_videos
        if "opening" in (video.get("name") or "").lower()
    ]

    if trailers:
        video = trailers[0]
    elif teasers:
        video = teasers[0]
    elif openings:
        video = openings[0]
    else:
        video = youtube_videos[0]

    key = video.get("key")

    return (
        f"https://www.youtube.com/watch?v={key}",
        f"https://www.youtube.com/embed/{key}"
    )


def get_item_title(item, media_type):
    if media_type == "movie":
        return item.get("title")

    return item.get("name")


def get_item_original_title(item, media_type):
    if media_type == "movie":
        return item.get("original_title")

    return item.get("original_name")


def get_item_date(item, media_type):
    if media_type == "movie":
        return item.get("release_date")

    return item.get("first_air_date")


def item_allowed(item, media_type):
    tmdb_id = item.get("id")
    title = get_item_title(item, media_type)
    date_value = get_item_date(item, media_type)
    year = get_year(date_value)
    rating = item.get("vote_average") or 0
    vote_count = item.get("vote_count") or 0
    lang = item.get("original_language")
    poster_path = item.get("poster_path")

    if not tmdb_id:
        return False

    if not year or year < MIN_YEAR:
        return False

    if rating < MIN_RATING:
        return False

    if vote_count < MIN_VOTE_COUNT:
        return False

    if lang not in ORIGINAL_LANGS:
        return False

    if not poster_path:
        return False

    if not is_valid_title(title):
        return False

    return True


def get_details(media_type, tmdb_id):
    if media_type == "movie":
        return api_get(
            f"/movie/{tmdb_id}",
            append_to_response="videos"
        )

    return api_get(
        f"/tv/{tmdb_id}",
        append_to_response="videos"
    )


def get_discover_page(media_type, page, year, lang, animation_genre_id):
    if media_type == "movie":
        params = {
            "page": page,
            "sort_by": "popularity.desc",
            "include_adult": "false",
            "include_video": "false",
            "primary_release_year": year,
            "with_original_language": lang,
            "with_genres": animation_genre_id,
            "vote_count.gte": MIN_VOTE_COUNT,
            "vote_average.gte": MIN_RATING
        }

        return api_get("/discover/movie", **params)

    params = {
        "page": page,
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "include_null_first_air_dates": "false",
        "first_air_date_year": year,
        "with_original_language": lang,
        "with_genres": animation_genre_id,
        "vote_count.gte": MIN_VOTE_COUNT,
        "vote_average.gte": MIN_RATING
    }

    return api_get("/discover/tv", **params)


def build_row(base_item, details, media_type, poster_local, trailer_youtube, trailer_embed):
    tmdb_id = details.get("id") or base_item.get("id")
    media_key = f"{media_type}_{tmdb_id}"

    if media_type == "movie":
        title = details.get("title") or base_item.get("title")
        original_title = details.get("original_title") or base_item.get("original_title")
        release_date = details.get("release_date") or base_item.get("release_date") or ""
        first_air_date = ""
        last_air_date = ""
        year = get_year(release_date)
        runtime = details.get("runtime") or 0
        budget = details.get("budget") or 0
        revenue = details.get("revenue") or 0
        number_of_seasons = 0
        number_of_episodes = 0
        episode_run_time = ""
        tv_type = ""
        networks = ""
    else:
        title = details.get("name") or base_item.get("name")
        original_title = details.get("original_name") or base_item.get("original_name")
        release_date = ""
        first_air_date = details.get("first_air_date") or base_item.get("first_air_date") or ""
        last_air_date = details.get("last_air_date") or ""
        year = get_year(first_air_date)
        runtime = 0
        budget = 0
        revenue = 0
        number_of_seasons = details.get("number_of_seasons") or 0
        number_of_episodes = details.get("number_of_episodes") or 0
        episode_run_time = join_list(details.get("episode_run_time", []))
        tv_type = details.get("type") or ""
        networks = join_names(details.get("networks", []))

    genres = join_names(details.get("genres", []))
    production_companies = join_names(details.get("production_companies", []))
    origin_country = join_list(details.get("origin_country") or base_item.get("origin_country") or [])

    return {
        "media_key": media_key,
        "tmdb_id": tmdb_id,
        "media_type": media_type,
        "title": title,
        "original_title": original_title,
        "overview": details.get("overview") or base_item.get("overview") or "",
        "release_date": release_date,
        "first_air_date": first_air_date,
        "last_air_date": last_air_date,
        "year": year or "",
        "rating": base_item.get("vote_average") or details.get("vote_average") or 0,
        "vote_count": base_item.get("vote_count") or details.get("vote_count") or 0,
        "popularity": base_item.get("popularity") or details.get("popularity") or 0,
        "budget": budget,
        "revenue": revenue,
        "runtime": runtime,
        "number_of_seasons": number_of_seasons,
        "number_of_episodes": number_of_episodes,
        "episode_run_time": episode_run_time,
        "genres": genres,
        "language": base_item.get("original_language") or details.get("original_language") or "",
        "origin_country": origin_country,
        "status": details.get("status") or "",
        "tv_type": tv_type,
        "networks": networks,
        "production_companies": production_companies,
        "adult": base_item.get("adult") or details.get("adult") or False,
        "poster_local": poster_local,
        "trailer_youtube": trailer_youtube,
        "trailer_embed": trailer_embed
    }


def write_item(writer, file, item, media_type, written_keys):
    tmdb_id = item.get("id")
    media_key = f"{media_type}_{tmdb_id}"

    if media_key in written_keys:
        return False, "duplicate"

    if not item_allowed(item, media_type):
        return False, "filtered"

    try:
        details = get_details(media_type, tmdb_id)
    except Exception as error:
        print(f"DETAILS ERROR {media_key}: {error}")
        return False, "details_error"

    title = get_item_title(details, media_type) or get_item_title(item, media_type)

    if not is_valid_title(title):
        return False, "bad_title"

    poster_local = download_poster(
        details.get("poster_path") or item.get("poster_path"),
        media_type,
        tmdb_id
    )

    if not poster_local:
        return False, "poster_error"

    trailer_youtube, trailer_embed = get_trailer(details)

    row = build_row(
        item,
        details,
        media_type,
        poster_local,
        trailer_youtube,
        trailer_embed
    )

    writer.writerow(row)
    file.flush()

    written_keys.add(media_key)

    print(f"WRITE: {media_type.upper()} | {title}")

    time.sleep(0.12)

    return True, "written"


def main():
    if API_KEY == "ВСТАВЬ_КЛЮЧ":
        print("Укажи API_KEY")
        return

    written_keys = load_written_keys()
    total_written = 0
    total_skipped = 0

    try:
        animation_genres = {
            "movie": get_animation_genre_id("movie"),
            "tv": get_animation_genre_id("tv")
        }
    except Exception as error:
        print(f"GENRE ERROR: {error}")
        return

    print("ANIMATION GENRES:", animation_genres)

    mode = "a" if os.path.exists(CSV_FILE) else "w"

    with open(CSV_FILE, mode, encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)

        if need_header():
            writer.writeheader()

        for media_type in MEDIA_TYPES:
            animation_genre_id = animation_genres[media_type]

            for year in range(MAX_YEAR, MIN_YEAR - 1, -1):
                for lang in ORIGINAL_LANGS:
                    try:
                        first_page = get_discover_page(
                            media_type,
                            1,
                            year,
                            lang,
                            animation_genre_id
                        )
                    except Exception as error:
                        print(f"START ERROR TYPE {media_type} YEAR {year} LANG {lang}: {error}")
                        time.sleep(2)
                        continue

                    total_pages = first_page.get("total_pages") or 1
                    total_results = first_page.get("total_results") or 0
                    pages_to_load = min(total_pages, MAX_API_PAGE)

                    if total_results == 0:
                        continue

                    print(f"TYPE {media_type} | YEAR {year} | LANG {lang} | RESULTS {total_results} | PAGES {pages_to_load}")

                    for page in range(1, pages_to_load + 1):
                        try:
                            data = first_page if page == 1 else get_discover_page(
                                media_type,
                                page,
                                year,
                                lang,
                                animation_genre_id
                            )

                            results = data.get("results", [])

                            if not results:
                                break

                            print(f"PAGE {page}/{pages_to_load} | TYPE {media_type} | YEAR {year} | LANG {lang} | ITEMS {len(results)}")

                            for item in results:
                                success, reason = write_item(
                                    writer,
                                    file,
                                    item,
                                    media_type,
                                    written_keys
                                )

                                if success:
                                    total_written += 1
                                elif reason != "duplicate":
                                    total_skipped += 1

                            print(f"DONE PAGE {page} | WRITTEN {total_written} | SKIPPED {total_skipped}")

                            time.sleep(0.25)

                        except Exception as error:
                            print(f"PAGE ERROR TYPE {media_type} YEAR {year} LANG {lang} PAGE {page}: {error}")
                            time.sleep(2)

    print("FINISHED")
    print("WRITTEN:", total_written)
    print("SKIPPED:", total_skipped)
    print("TOTAL IN CSV:", len(written_keys))


if __name__ == "__main__":
    main()