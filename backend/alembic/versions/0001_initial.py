"""Initial user-scoped portfolio snapshot tables.

Revision ID: 0001
Revises:
"""
from alembic import op
from sqlalchemy.schema import CreateTable, CreateIndex
from app.database import Base
from app import models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Frozen at the original five tables. Newer tables must arrive via new
# revisions: rendering live metadata here would recreate them and collide
# with later upgrades on fresh databases.
INITIAL_TABLES = ("users", "user_sessions", "portfolios", "holding_snapshots", "snapshot_positions")


def upgrade():
    # Metadata table order follows foreign-key dependencies.
    for name in INITIAL_TABLES:
        table = Base.metadata.tables[name]
        op.execute(CreateTable(table))
        for index in table.indexes:
            op.execute(CreateIndex(index))


def downgrade():
    for name in reversed(INITIAL_TABLES):
        op.drop_table(name)
