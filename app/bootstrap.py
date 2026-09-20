"""Single-run database bootstrap for BookOracle.

This module exists so that schema creation, migrations and the pre-migration
backup happen ONCE per container start, instead of inside every gunicorn
worker's import of ``run:app``.

Why: when those steps ran in ``create_app()``, each worker raced the others on a
fresh database. ``db.create_all()`` is not atomic, so the losers died with
``sqlite3.OperationalError: table user already exists``, gunicorn reported
"Worker failed to boot" and shut the master down. Measured cold starts at the
production setting (``WORKERS=4``) survived 0 out of 3 trials. Gunicorn's
``--preload`` makes it worse: the schema would be created in the arbiter before
the app is forked.

Entry point: ``python -m app.bootstrap`` (run by docker-entrypoint.sh before
gunicorn starts). Safe to run repeatedly; it is a no-op on an up-to-date schema.
"""

import os
import sys

# Allow direct execution (python app/bootstrap.py) as well as -m.
if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

from app import (
    add_streak_offset_column,
    assign_existing_books_to_admin,
    check_if_migrations_needed,
    create_app,
    run_email_normalization_migration,
    run_security_privacy_migration,
)
from app.models import User, db


def _backup_dir(db_path):
    return os.path.join(os.path.dirname(os.path.abspath(db_path)), "backups")


def create_pre_migration_backup(db_path):
    """Back up the database before migrations, to a unique timestamped file.

    Unlike a plain copy, the result is guaranteed to be a consistent snapshot
    (sqlite3's backup API, not a byte copy of a possibly-hot file) and is never
    overwritten when two runs happen within the same second.
    """
    if not os.path.exists(db_path):
        return None

    import sqlite3
    from datetime import datetime

    backup_dir = _backup_dir(db_path)
    os.makedirs(backup_dir, exist_ok=True)

    # Microseconds keep concurrent/rapid runs from clobbering each other.
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    backup_path = os.path.join(
        backup_dir, f"{os.path.basename(db_path)}.pre-migration_{stamp}"
    )

    try:
        source = sqlite3.connect(db_path)
        try:
            target = sqlite3.connect(backup_path)
            try:
                with target:
                    source.backup(target)
            finally:
                target.close()
        finally:
            source.close()
        print(f"OK    Pre-migration backup written: {backup_path}")
        return backup_path
    except Exception as exc:  # pragma: no cover - defensive
        print(f"WARN  Pre-migration backup failed: {exc}")
        return None


def run_migrations(app):
    """Create the schema and apply every incremental migration. Idempotent.

    This is the logic that used to live inline in ``create_app()``; it is kept
    byte-for-byte equivalent in behaviour so existing databases migrate exactly
    as before.
    """
    with app.app_context():
        db_path = app.config.get("SQLALCHEMY_DATABASE_URI", "").replace("sqlite:///", "")
        inspector = inspect(db.engine)

        migrations_needed, migration_list = check_if_migrations_needed(inspector)

        if migrations_needed:
            print("NOTE  Migrations required: %s" % ", ".join(migration_list))
            print("INFO  Creating database backup before migration...")
            create_pre_migration_backup(db_path)
        else:
            print("OK    Database schema is up-to-date, no migrations needed")

        existing_tables = inspector.get_table_names()

        if not existing_tables:
            print("INFO  Creating fresh database schema...")
            db.create_all()
            print("OK    Database schema created. Setup required on first visit.")
        else:
            print("INFO  Database already exists, checking for migrations...")

            if "user" not in existing_tables:
                print("INFO  Adding user authentication tables...")
                db.create_all()
                print("OK    User tables created. Setup required on first visit.")

            if "invite_token" not in existing_tables:
                print("INFO  Adding invite_token table...")
                db.create_all()
                print("OK    InviteToken table created for invite system.")

            if "user_rating" not in existing_tables:
                print("INFO  Adding user_rating table...")
                db.create_all()
                print("OK    UserRating table created for rating system.")

            if "user" in existing_tables:
                add_streak_offset_column(inspector, db.engine)
                inspector = inspect(db.engine)
                run_security_privacy_migration(inspector, db.engine)

                try:
                    run_email_normalization_migration()
                except Exception as exc:
                    print(f"WARN  Error during email normalization: {exc}")

                try:
                    if User.query.filter_by(is_admin=True).count() > 0:
                        print("INFO  Checking for orphaned books...")
                        assign_existing_books_to_admin()
                except Exception as exc:
                    print(f"WARN  Error checking for admin users: {exc}")

            if "book" in existing_tables:
                try:
                    columns = [c["name"] for c in inspector.get_columns("book")]

                    if "user_id" not in columns:
                        print("INFO  Adding user_id to book table...")
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE book ADD COLUMN user_id INTEGER"))
                            conn.commit()
                        print("OK    user_id column added to book table.")
                        try:
                            if User.query.filter_by(is_admin=True).count() > 0:
                                assign_existing_books_to_admin()
                        except Exception as exc:
                            print(f"WARN  Error assigning books to admin: {exc}")

                    new_columns = [
                        "description", "published_date", "page_count", "categories",
                        "publisher", "language", "average_rating", "rating_count",
                        "created_at", "owned",
                    ]
                    missing_columns = [c for c in new_columns if c not in columns]

                    if missing_columns:
                        print(f"INFO  Adding missing book columns: {missing_columns}")
                        with db.engine.connect() as conn:
                            for col_name in missing_columns:
                                if col_name in ("page_count", "rating_count"):
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} INTEGER"))
                                elif col_name == "average_rating":
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} REAL"))
                                elif col_name == "owned":
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} BOOLEAN DEFAULT 0"))
                                elif col_name in ("categories", "publisher"):
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} VARCHAR(500)"))
                                elif col_name == "language":
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} VARCHAR(10)"))
                                elif col_name == "published_date":
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} VARCHAR(50)"))
                                elif col_name == "created_at":
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} DATETIME"))
                                else:
                                    conn.execute(text(f"ALTER TABLE book ADD COLUMN {col_name} TEXT"))
                            conn.commit()
                        print("OK    Book schema migration completed.")
                except Exception as exc:
                    print(f"WARN  Book schema migration failed: {exc}")

            if "shared_book_data" not in existing_tables:
                print("INFO  Creating shared_book_data table...")
                try:
                    with db.engine.connect() as conn:
                        conn.execute(text("""
                            CREATE TABLE shared_book_data (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                custom_id VARCHAR(20) UNIQUE NOT NULL,
                                title VARCHAR(255) NOT NULL,
                                author VARCHAR(255) NOT NULL,
                                isbn VARCHAR(13),
                                cover_url VARCHAR(512),
                                description TEXT,
                                published_date VARCHAR(50),
                                page_count INTEGER,
                                categories VARCHAR(500),
                                publisher VARCHAR(255),
                                language VARCHAR(10),
                                average_rating REAL,
                                rating_count INTEGER,
                                created_at DATETIME,
                                updated_at DATETIME,
                                created_by INTEGER NOT NULL,
                                FOREIGN KEY (created_by) REFERENCES user (id)
                            )
                        """))
                        conn.commit()
                    print("OK    shared_book_data table created.")
                except Exception as exc:
                    print(f"WARN  shared_book_data table creation failed: {exc}")
            else:
                print("OK    shared_book_data table already exists.")

            if "book" in existing_tables:
                try:
                    columns = [c["name"] for c in inspector.get_columns("book")]
                    if "shared_book_id" not in columns:
                        print("INFO  Adding shared_book_id column to book table...")
                        with db.engine.connect() as conn:
                            conn.execute(text(
                                "ALTER TABLE book ADD COLUMN shared_book_id INTEGER "
                                "REFERENCES shared_book_data(id)"
                            ))
                            conn.commit()
                        print("OK    shared_book_id column added to book table.")
                    else:
                        print("OK    shared_book_id column already exists in book table.")
                except Exception as exc:
                    print(f"WARN  shared_book_id column migration failed: {exc}")

            # Idempotent column checks. These tolerate the column already
            # existing (two workers used to be able to race here).
            for table, column, ddl in (
                ("book", "owned", "ALTER TABLE book ADD COLUMN owned INTEGER DEFAULT 0"),
                ("user", "is_pro", "ALTER TABLE user ADD COLUMN is_pro INTEGER DEFAULT 0"),
            ):
                try:
                    if table in existing_tables:
                        cols = [c["name"] for c in inspect(db.engine).get_columns(table)]
                        if column not in cols:
                            print(f"INFO  Adding '{column}' column to {table} table...")
                            with db.engine.connect() as conn:
                                conn.execute(text(ddl))
                                conn.commit()
                                print(f"OK    '{column}' column added to {table} table.")
                except Exception as exc:
                    message = str(exc).lower()
                    if "duplicate column" in message or "already exists" in message:
                        print(f"OK    '{column}' column already present on {table}.")
                    else:
                        print(f"WARN  '{column}' column migration failed: {exc}")

            if "reading_log" in existing_tables:
                try:
                    columns = [c["name"] for c in inspector.get_columns("reading_log")]
                    missing = [c for c in ("user_id", "created_at") if c not in columns]

                    if missing:
                        print(f"INFO  Adding missing reading_log columns: {missing}")
                        with db.engine.connect() as conn:
                            if "user_id" in missing:
                                conn.execute(text("ALTER TABLE reading_log ADD COLUMN user_id INTEGER"))
                            if "created_at" in missing:
                                conn.execute(text("ALTER TABLE reading_log ADD COLUMN created_at DATETIME"))
                            conn.commit()
                        print("OK    reading_log table updated.")

                        if "user_id" in missing:
                            try:
                                admin_user = User.query.filter_by(is_admin=True).first()
                                if admin_user:
                                    from app.models import ReadingLog
                                    unassigned = ReadingLog.query.filter_by(user_id=None).all()
                                    if unassigned:
                                        print(f"INFO  Assigning {len(unassigned)} reading logs to admin user...")
                                        for log in unassigned:
                                            log.user_id = admin_user.id
                                        db.session.commit()
                                        print("OK    Reading logs assigned to admin user.")
                            except Exception as exc:
                                print(f"WARN  Reading log migration failed: {exc}")
                except Exception as exc:
                    print(f"WARN  Reading log migration failed: {exc}")

        print("OK    Database bootstrap completed.")


def main():
    app = create_app()
    run_migrations(app)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
