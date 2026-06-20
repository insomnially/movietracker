import csv
import os
import re
import time
from pathlib import Path
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_KEY = "c60d23df12ac98c67616eb154827dd48"

CSV_FILE = "movies_25k.csv"
POSTER_DIR = Path("posters2")

LANGUAGE = "ru-RU"
MIN_YEAR = 2000
MAX_YEAR = datetime.now().year
MIN_RATING = 5
MIN_VOTE_COUNT = 1000
MAX_API_PAGE = 500
ALLOWED_LANGS = ["en", "ru"]

POSTER_DIR.mkdir(exist_ok=True)

FIELDS = [
    "id",
    "title",
    "original_title",
    "overview",
    "release_date",
    "year",
    "rating",
    "vote_count",
    "budget",
    "revenue",
    "runtime",
    "genres",
    "language",
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


def get_year(release_date):
    if not release_date or len(release_date) < 4:
        return None

    year = release_date[:4]

    if not year.isdigit():
        return None

    return int(year)


def load_written_ids():
    if not os.path.exists(CSV_FILE):
        return set()

    ids = set()

    with open(CSV_FILE, "r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            movie_id = row.get("id")

            if movie_id and movie_id.isdigit():
                ids.add(int(movie_id))

    return ids


def need_header():
    return not os.path.exists(CSV_FILE) or os.path.getsize(CSV_FILE) == 0


def download_poster(poster_path, movie_id):
    if not poster_path:
        return ""

    file_path = POSTER_DIR / f"{movie_id}.jpg"

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


def get_trailer(movie):
    videos = movie.get("videos", {}).get("results", [])

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

    video = trailers[0] if trailers else youtube_videos[0]
    key = video.get("key")

    return (
        f"https://www.youtube.com/watch?v={key}",
        f"https://www.youtube.com/embed/{key}"
    )


def movie_allowed(movie):
    movie_id = movie.get("id")
    title = movie.get("title")
    release_date = movie.get("release_date")
    year = get_year(release_date)
    rating = movie.get("vote_average") or 0
    vote_count = movie.get("vote_count") or 0
    lang = movie.get("original_language")
    poster_path = movie.get("poster_path")

    if not movie_id:
        return False

    if not year or year < MIN_YEAR:
        return False

    if rating < MIN_RATING:
        return False

    if vote_count < MIN_VOTE_COUNT:
        return False

    if lang not in ALLOWED_LANGS:
        return False

    if not poster_path:
        return False

    if not is_valid_title(title):
        return False

    return True


def get_movie_details(movie_id):
    return api_get(
        f"/movie/{movie_id}",
        append_to_response="videos"
    )


def get_discover_page(page, year, lang):
    params = {
        "page": page,
        "sort_by": "popularity.desc",
        "include_adult": "false",
        "include_video": "false",
        "primary_release_year": year,
        "with_original_language": lang,
        "vote_count.gte": MIN_VOTE_COUNT,
        "vote_average.gte": MIN_RATING
    }

    return api_get("/discover/movie", **params)


def build_row(base_movie, details, poster_local, trailer_youtube, trailer_embed):
    release_date = details.get("release_date") or base_movie.get("release_date") or ""
    year = get_year(release_date)

    genres = ", ".join(
        genre.get("name", "")
        for genre in details.get("genres", [])
        if genre.get("name")
    )

    return {
        "id": details.get("id") or base_movie.get("id"),
        "title": details.get("title") or base_movie.get("title"),
        "original_title": details.get("original_title") or base_movie.get("original_title"),
        "overview": details.get("overview") or base_movie.get("overview") or "",
        "release_date": release_date,
        "year": year or "",
        "rating": base_movie.get("vote_average") or details.get("vote_average") or 0,
        "vote_count": base_movie.get("vote_count") or details.get("vote_count") or 0,
        "budget": details.get("budget") or 0,
        "revenue": details.get("revenue") or 0,
        "runtime": details.get("runtime") or 0,
        "genres": genres,
        "language": base_movie.get("original_language") or details.get("original_language") or "",
        "adult": base_movie.get("adult") or details.get("adult") or False,
        "poster_local": poster_local,
        "trailer_youtube": trailer_youtube,
        "trailer_embed": trailer_embed
    }


def write_movie(writer, file, movie, written_ids):
    movie_id = movie.get("id")

    if movie_id in written_ids:
        return False, "duplicate"

    if not movie_allowed(movie):
        return False, "filtered"

    try:
        details = get_movie_details(movie_id)
    except Exception as error:
        print(f"DETAILS ERROR {movie_id}: {error}")
        return False, "details_error"

    title = details.get("title") or movie.get("title")

    if not is_valid_title(title):
        return False, "bad_title"

    poster_local = download_poster(
        details.get("poster_path") or movie.get("poster_path"),
        movie_id
    )

    if not poster_local:
        return False, "poster_error"

    trailer_youtube, trailer_embed = get_trailer(details)

    row = build_row(
        movie,
        details,
        poster_local,
        trailer_youtube,
        trailer_embed
    )

    writer.writerow(row)
    file.flush()

    written_ids.add(movie_id)

    print(f"WRITE: {title}")

    time.sleep(0.12)

    return True, "written"


def main():
    if API_KEY == "ВСТАВЬ_КЛЮЧ":
        print("Укажи API_KEY")
        return

    written_ids = load_written_ids()
    total_written = 0
    total_skipped = 0

    mode = "a" if os.path.exists(CSV_FILE) else "w"

    with open(CSV_FILE, mode, encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)

        if need_header():
            writer.writeheader()

        for year in range(MAX_YEAR, MIN_YEAR - 1, -1):
            for lang in ALLOWED_LANGS:
                try:
                    first_page = get_discover_page(1, year, lang)
                except Exception as error:
                    print(f"START ERROR YEAR {year} LANG {lang}: {error}")
                    time.sleep(2)
                    continue

                total_pages = first_page.get("total_pages") or 1
                total_results = first_page.get("total_results") or 0
                pages_to_load = min(total_pages, MAX_API_PAGE)

                if total_results == 0:
                    continue

                print(f"YEAR {year} | LANG {lang} | RESULTS {total_results} | PAGES {pages_to_load}")

                for page in range(1, pages_to_load + 1):
                    try:
                        data = first_page if page == 1 else get_discover_page(page, year, lang)
                        results = data.get("results", [])

                        if not results:
                            break

                        print(f"PAGE {page}/{pages_to_load} | YEAR {year} | LANG {lang} | MOVIES {len(results)}")

                        for movie in results:
                            success, reason = write_movie(writer, file, movie, written_ids)

                            if success:
                                total_written += 1
                            elif reason != "duplicate":
                                total_skipped += 1

                        print(f"DONE PAGE {page} | WRITTEN {total_written} | SKIPPED {total_skipped}")

                        time.sleep(0.25)

                    except Exception as error:
                        print(f"PAGE ERROR YEAR {year} LANG {lang} PAGE {page}: {error}")
                        time.sleep(2)

    print("FINISHED")
    print("WRITTEN:", total_written)
    print("SKIPPED:", total_skipped)
    print("TOTAL IN CSV:", len(written_ids))


if __name__ == "__main__":
    main()