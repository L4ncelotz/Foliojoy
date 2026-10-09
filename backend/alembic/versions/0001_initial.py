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


def upgrade():
    # Metadata table order follows foreign-key dependencies.
    for table in Base.metadata.sorted_tables:
        op.execute(CreateTable(table))
        for index in table.indexes:
            op.execute(CreateIndex(index))


def downgrade():
    for table in reversed(Base.metadata.sorted_tables):
        op.drop_table(table.name)
