import os
import pandas as pd

from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.dialects.postgresql import insert

DB_USER = os.getenv("DB_USER") or "postgres"
DB_PASSWORD = os.getenv("DB_PASSWORD") or "b1354325"
DB_HOST = os.getenv("DB_HOST") or "localhost"
DB_PORT = os.getenv("DB_PORT") or "5432"
DB_NAME = os.getenv("DB_NAME") or "movies_db"

CSV_FILE = "anime_25k.csv"
TABLE_NAME = "anime"
BATCH_SIZE = 1000

engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


def prepare_db():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS anime (
                media_key TEXT PRIMARY KEY,
                tmdb_id BIGINT NOT NULL,
                media_type TEXT NOT NULL,
                title TEXT,
                original_title TEXT,
                overview TEXT,
                release_date DATE,
                first_air_date DATE,
                last_air_date DATE,
                year INTEGER,
                rating DOUBLE PRECISION,
                vote_count BIGINT,
                popularity DOUBLE PRECISION,
                budget BIGINT,
                revenue BIGINT,
                runtime INTEGER,
                number_of_seasons INTEGER,
                number_of_episodes INTEGER,
                episode_run_time TEXT,
                genres TEXT,
                language TEXT,
                origin_country TEXT,
                status TEXT,
                tv_type TEXT,
                networks TEXT,
                production_companies TEXT,
                adult BOOLEAN DEFAULT FALSE,
                poster_local TEXT,
                trailer_youtube TEXT,
                trailer_embed TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT anime_media_type_check CHECK (media_type IN ('movie', 'tv')),
                CONSTRAINT anime_tmdb_unique UNIQUE (tmdb_id, media_type)
            )
        """))

        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS tmdb_id BIGINT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS media_type TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS title TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS original_title TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS overview TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS release_date DATE"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS first_air_date DATE"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS last_air_date DATE"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS year INTEGER"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS vote_count BIGINT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS popularity DOUBLE PRECISION"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS budget BIGINT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS revenue BIGINT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS runtime INTEGER"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS number_of_seasons INTEGER"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS number_of_episodes INTEGER"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS episode_run_time TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS genres TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS language TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS origin_country TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS status TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS tv_type TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS networks TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS production_companies TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS adult BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS poster_local TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS trailer_youtube TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS trailer_embed TEXT"))
        conn.execute(text("ALTER TABLE anime ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_title ON anime (title)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_media_type ON anime (media_type)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_year ON anime (year)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_rating ON anime (rating DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_vote_count ON anime (vote_count DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_language ON anime (language)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_anime_status ON anime (status)"))


def normalize_text(value):
    if pd.isna(value):
        return None

    value = str(value).strip()

    if not value:
        return None

    if value.lower() in ["nan", "none", "null"]:
        return None

    return value


def normalize_path(value):
    value = normalize_text(value)

    if not value:
        return None

    value = value.replace("\\", "/")

    while value.startswith("./"):
        value = value[2:]

    while value.startswith("/"):
        value = value[1:]

    return value


def normalize_bool(value):
    if pd.isna(value):
        return False

    if isinstance(value, bool):
        return value

    value = str(value).strip().lower()

    return value in ["true", "1", "yes", "y", "да"]


def normalize_media_type(value):
    value = normalize_text(value)

    if not value:
        return None

    value = value.lower()

    if value not in ["movie", "tv"]:
        return None

    return value


def load_csv():
    df = pd.read_csv(
        CSV_FILE,
        encoding="utf-8",
        engine="python",
        on_bad_lines="skip"
    )

    rename_map = {
        "id": "tmdb_id",
        "name": "title",
        "original_name": "original_title",
        "vote_average": "rating",
        "poster_path": "poster_local",
        "original_language": "language"
    }

    for old_col, new_col in rename_map.items():
        if old_col in df.columns and new_col not in df.columns:
            df = df.rename(columns={old_col: new_col})

    needed_cols = [
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

    for col in needed_cols:
        if col not in df.columns:
            df[col] = None

    df = df[needed_cols]

    df["tmdb_id"] = pd.to_numeric(df["tmdb_id"], errors="coerce")
    df = df.dropna(subset=["tmdb_id"])
    df["tmdb_id"] = df["tmdb_id"].astype("int64")

    df["media_type"] = df["media_type"].apply(normalize_media_type)
    df = df[df["media_type"].notna()]

    df["media_key"] = df.apply(
        lambda row: normalize_text(row["media_key"]) or f"{row['media_type']}_{row['tmdb_id']}",
        axis=1
    )

    text_cols = [
        "media_key",
        "media_type",
        "title",
        "original_title",
        "overview",
        "episode_run_time",
        "genres",
        "language",
        "origin_country",
        "status",
        "tv_type",
        "networks",
        "production_companies",
        "trailer_youtube",
        "trailer_embed"
    ]

    for col in text_cols:
        df[col] = df[col].apply(normalize_text)

    df["poster_local"] = df["poster_local"].apply(normalize_path)

    df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce").dt.date
    df["first_air_date"] = pd.to_datetime(df["first_air_date"], errors="coerce").dt.date
    df["last_air_date"] = pd.to_datetime(df["last_air_date"], errors="coerce").dt.date

    df["year"] = pd.to_numeric(df["year"], errors="coerce")

    date_for_year = df["release_date"].combine_first(df["first_air_date"])
    empty_year = df["year"].isna() & date_for_year.notna()

    df.loc[empty_year, "year"] = pd.to_datetime(
        date_for_year.loc[empty_year],
        errors="coerce"
    ).dt.year

    float_cols = ["rating", "popularity"]

    for col in float_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    int_cols = [
        "year",
        "vote_count",
        "budget",
        "revenue",
        "runtime",
        "number_of_seasons",
        "number_of_episodes"
    ]

    for col in int_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")

    df["adult"] = df["adult"].apply(normalize_bool)

    df = df.drop_duplicates(subset=["media_key"], keep="last")

    df = df[df["title"].notna()]
    df = df[df["poster_local"].notna()]
    df = df[df["media_key"].notna()]
    df = df[df["media_type"].notna()]

    df = df.astype(object).where(pd.notnull(df), None)

    return df


def upsert_anime(df):
    metadata = MetaData()
    table = Table(TABLE_NAME, metadata, autoload_with=engine)

    records = df.to_dict(orient="records")

    if not records:
        return 0

    total = 0

    with engine.begin() as conn:
        for start in range(0, len(records), BATCH_SIZE):
            batch = records[start:start + BATCH_SIZE]

            stmt = insert(table).values(batch)

            update_cols = {
                col.name: getattr(stmt.excluded, col.name)
                for col in table.columns
                if col.name not in ["media_key", "created_at"]
            }

            stmt = stmt.on_conflict_do_update(
                index_elements=["media_key"],
                set_=update_cols
            )

            result = conn.execute(stmt)
            total += result.rowcount

            print(f"IMPORT {min(start + BATCH_SIZE, len(records))}/{len(records)}")

    return total


def main():
    prepare_db()

    df = load_csv()

    print("ROWS IN CSV:", len(df))

    total = upsert_anime(df)

    print("IMPORT DONE")
    print("ROWS INSERTED OR UPDATED:", total)


if __name__ == "__main__":
    main()