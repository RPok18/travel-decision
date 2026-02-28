"""add reply_to_id to answers

Revision ID: 0003_add_reply_to_id
Revises: 649aac93f9c1
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0003_add_reply_to_id"
down_revision = "649aac93f9c1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "answers",
        sa.Column("reply_to_id", sa.Integer(), sa.ForeignKey("answers.id"), nullable=True),
    )


def downgrade():
    op.drop_column("answers", "reply_to_id")
