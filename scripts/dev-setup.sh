#!/usr/bin/env bash
# ---------------------------------------------------------------
# APP AI AGGREGATOR — bootstrap do ambiente de desenvolvimento
#
# Idempotente: pode correr as vezes que forem precisas.
# Repõe o Postgres, o schema e as dependências após um restart
# do sandbox (onde só /home/user persiste).
#
#   bash scripts/dev-setup.sh
# ---------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "▸ raiz: $ROOT"

# --- 1. PostgreSQL ---------------------------------------------
if ! command -v psql >/dev/null 2>&1; then
  echo "▸ a instalar postgresql…"
  sudo apt-get install -y -qq postgresql postgresql-contrib >/dev/null 2>&1
fi

if ! pg_isready -q 2>/dev/null; then
  echo "▸ a arrancar o cluster…"
  sudo pg_ctlcluster 17 main start 2>/dev/null || true
  for _ in $(seq 1 20); do pg_isready -q 2>/dev/null && break; sleep 0.5; done
fi
pg_isready -q && echo "  postgres: ON" || { echo "  postgres: FALHOU"; exit 1; }

# --- 2. utilizador + base de dados -----------------------------
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='aggregator'" | grep -q 1 \
  || sudo -u postgres psql -q -c "CREATE USER aggregator WITH PASSWORD 'aggregator' SUPERUSER;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='ai_aggregator'" | grep -q 1 \
  || sudo -u postgres psql -q -c "CREATE DATABASE ai_aggregator OWNER aggregator;"
echo "  base de dados: ai_aggregator"

# --- 3. .env ----------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  .env criado a partir do exemplo — falta preencher GITHUB_TOKEN"
fi
chmod 600 .env

# --- 4. dependências --------------------------------------------
[ -d node_modules ] || { echo "▸ npm install…"; npm install --silent; }

# --- 5. schema + client -----------------------------------------
echo "▸ a aplicar o schema…"
npx prisma db push >/dev/null 2>&1
npx prisma generate >/dev/null 2>&1
echo "  schema sincronizado"

# --- 6. estado ---------------------------------------------------
TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | cut -d'"' -f2 || true)
if [ -n "$TOKEN" ]; then
  LOGIN=$(curl -s -H "Authorization: Bearer $TOKEN" -H "User-Agent: setup" \
    https://api.github.com/user | grep -o '"login": *"[^"]*"' | cut -d'"' -f4 || true)
  [ -n "$LOGIN" ] && echo "  github: ligado como $LOGIN" || echo "  github: TOKEN INVÁLIDO"
else
  echo "  github: NOT CONNECTED (sem token no .env)"
fi

REPOS=$(psql "postgresql://aggregator:aggregator@localhost:5432/ai_aggregator" \
  -tAc 'SELECT count(*) FROM "Repository"' 2>/dev/null || echo 0)
echo "  repositórios em cache: $REPOS"

cat <<'EOF'

pronto.

  npm run dev     servidor de desenvolvimento (porta 3000)
  npm run sync    sincronizar dados do GitHub
  npm run studio  inspecionar a base de dados

EOF
