#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until pg_isready -h postgres -p 5432 -U resumeuser; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Check if database exists, if not create it
psql -h postgres -U resumeuser -tc "SELECT 1 FROM pg_database WHERE datname = 'resumebuilderdb'" | grep -q 1 || psql -h postgres -U resumeuser -c "CREATE DATABASE resumebuilderdb"

echo "Database setup complete!"

# Run the schema initialization if the file exists
if [ -f "/docker-entrypoint-initdb.d/init.sql" ]; then
    echo "Running database schema initialization..."
    psql -h postgres -U resumeuser -d resumebuilderdb -f /docker-entrypoint-initdb.d/init.sql
    echo "Schema initialization complete!"
fi 