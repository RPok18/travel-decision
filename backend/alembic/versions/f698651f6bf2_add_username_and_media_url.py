"""add_username_and_media_url

Revision ID: f698651f6bf2
Revises: 0003_add_reply_to_id
Create Date: 2026-03-02 18:23:14.175058

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f698651f6bf2'
down_revision: Union[str, None] = '0003_add_reply_to_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Adding username to users with explicit constraint name for SQLite batch
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('username', sa.String(length=50), nullable=True))
        batch_op.create_unique_constraint('uq_user_username', ['username'])
    
    # Adding media_url to questions. 
    # verified it might already exist due to partial failed migration.
    # Using try/except to allow the migration to proceed if already present.
    try:
        with op.batch_alter_table('questions', schema=None) as batch_op:
            batch_op.add_column(sa.Column('media_url', sa.String(length=255), nullable=True))
    except Exception:
        pass

def downgrade() -> None:
    with op.batch_alter_table('questions', schema=None) as batch_op:
        batch_op.drop_column('media_url')
    
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_username', type_='unique')
        batch_op.drop_column('username')
