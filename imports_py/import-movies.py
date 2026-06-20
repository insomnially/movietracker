import os
import pandas as pd

from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.dialects.postgresql import insert

DB_USER = os.getenv("DB_USER") or "postgres"
DB_PASSWORD = os.getenv("DB_PASSWORD") or "b1354325"
DB_HOST = os.getenv("DB_HOST") or "localhost"
DB_PORT = os.getenv("DB_PORT") or "5432"
DB_NAME = os.getenv("DB_NAME") or "movies_db"

CSV_FILE = "movies_25k.csv"
TABLE_NAME = "movies"
BATCH_SIZE = 1000

engine = create_engine(
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


def prepare_db():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS movies (
                id BIGINT PRIMARY KEY,
                title TEXT,
                original_title TEXT,
                overview TEXT,
                release_date DATE,
                year INTEGER,
                rating DOUBLE PRECISION,
                vote_count BIGINT,
                budget BIGINT,
                revenue BIGINT,
                runtime INTEGER,
                genres TEXT,
                language TEXT,
                adult BOOLEAN DEFAULT FALSE,
                poster_local TEXT,
                trailer_youtube TEXT,
                trailer_embed TEXT
            )
        """))

        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS title TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS original_title TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS overview TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS release_date DATE"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS year INTEGER"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS vote_count BIGINT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS budget BIGINT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS revenue BIGINT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS runtime INTEGER"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS genres TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS language TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS adult BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_local TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS trailer_youtube TEXT"))
        conn.execute(text("ALTER TABLE movies ADD COLUMN IF NOT EXISTS trailer_embed TEXT"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_movies_title ON movies (title)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_movies_year ON movies (year)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies (rating DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_movies_vote_count ON movies (vote_count DESC)"))


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


def load_csv():
    df = pd.read_csv(
        CSV_FILE,
        encoding="utf-8",
        engine="python",
        on_bad_lines="skip"
    )

    rename_map = {
        "vote_average": "rating",
        "poster_path": "poster_local",
        "original_language": "language"
    }

    for old_col, new_col in rename_map.items():
        if old_col in df.columns and new_col not in df.columns:
            df = df.rename(columns={old_col: new_col})

    needed_cols = [
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

    for col in needed_cols:
        if col not in df.columns:
            df[col] = None

    df = df[needed_cols]

    df["id"] = pd.to_numeric(df["id"], errors="coerce")
    df = df.dropna(subset=["id"])
    df["id"] = df["id"].astype("int64")

    text_cols = [
        "title",
        "original_title",
        "overview",
        "genres",
        "language",
        "trailer_youtube",
        "trailer_embed"
    ]

    for col in text_cols:
        df[col] = df[col].apply(normalize_text)

    df["poster_local"] = df["poster_local"].apply(normalize_path)

    df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce").dt.date

    df["year"] = pd.to_numeric(df["year"], errors="coerce")

    empty_year = df["year"].isna() & df["release_date"].notna()

    df.loc[empty_year, "year"] = pd.to_datetime(
        df.loc[empty_year, "release_date"],
        errors="coerce"
    ).dt.year

    float_cols = ["rating"]

    for col in float_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    int_cols = ["year", "vote_count", "budget", "revenue", "runtime"]

    for col in int_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")

    df["adult"] = df["adult"].apply(normalize_bool)

    df = df.drop_duplicates(subset=["id"], keep="last")

    df = df[df["title"].notna()]
    df = df[df["poster_local"].notna()]

    df = df.astype(object).where(pd.notnull(df), None)

    return df


def upsert_movies(df):
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
                if col.name != "id"
            }

            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
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

    total = upsert_movies(df)

    print("IMPORT DONE")
    print("ROWS INSERTED OR UPDATED:", total)


if __name__ == "__main__":
    main()