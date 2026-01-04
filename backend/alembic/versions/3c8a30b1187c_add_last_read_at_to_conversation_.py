"""add last_read_at to conversation participants

Revision ID: 3c8a30b1187c
Revises: 3476c0b28fee
Create Date: 2026-01-03 19:44:25.722643

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c8a30b1187c'
down_revision: Union[str, Sequence[str], None] = '3476c0b28fee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'conversation_participants',
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('conversation_participants', 'last_read_at')
