"""Initial DataLens schema

Revision ID: 42cb9960fcd5
Revises: 
Create Date: 2026-11-09 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '42cb9960fcd5'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'subjects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('semester', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subjects_id'), 'subjects', ['id'], unique=False)

    op.create_table(
        'reminders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reminder_at', sa.DateTime(), nullable=False),
        sa.Column('related_type', sa.String(length=100), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reminders_id'), 'reminders', ['id'], unique=False)

    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=100), nullable=False),
        sa.Column('assigned_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('priority', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)

    op.create_table(
        'schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=100), nullable=False),
        sa.Column('scheduled_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(length=20), nullable=False),
        sa.Column('end_time', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_schedules_id'), 'schedules', ['id'], unique=False)

    op.create_table(
        'study_materials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_study_materials_id'), 'study_materials', ['id'], unique=False)

    op.create_table(
        'datasets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.Column('column_count', sa.Integer(), nullable=False),
        sa.Column('column_names', sa.JSON(), nullable=False),
        sa.Column('missing_values', sa.JSON(), nullable=False),
        sa.Column('duplicate_rows', sa.Integer(), nullable=False),
        sa.Column('stats', sa.JSON(), nullable=False),
        sa.Column('preview', sa.JSON(), nullable=False),
        sa.Column('chart_summary', sa.JSON(), nullable=False),
        sa.Column('cleaned_csv_path', sa.String(length=500), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_datasets_id'), 'datasets', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_datasets_id'), table_name='datasets')
    op.drop_table('datasets')
    op.drop_index(op.f('ix_study_materials_id'), table_name='study_materials')
    op.drop_table('study_materials')
    op.drop_index(op.f('ix_schedules_id'), table_name='schedules')
    op.drop_table('schedules')
    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')
    op.drop_index(op.f('ix_reminders_id'), table_name='reminders')
    op.drop_table('reminders')
    op.drop_index(op.f('ix_subjects_id'), table_name='subjects')
    op.drop_table('subjects')
