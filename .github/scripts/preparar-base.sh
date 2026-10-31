#!/usr/bin/env bash
# Arma la base del CI desde cero: usuarios, migraciones, seeds y la usuaria del panel.
set -euo pipefail

# MySQL corre en un contenedor: los usuarios entran por red, no por localhost.
sed "s/'@'localhost'/'@'%'/g" database/setup.sql | mysql -h 127.0.0.1 -u root -proot

for f in $(ls database/migrations/*.sql | sort -V) \
         database/seeds/seed_01_servicios.sql database/seeds/seed_02_horarios.sql \
         database/seeds/ecommerce-datos-ejemplo.sql database/seeds/seed_03_turnos_demo.sql \
         database/seeds/seed_04_turnos_proximos.sql database/seeds/seed_05_pedidos_demo.sql; do
  echo "→ $f"
  mysql -h 127.0.0.1 -u dp_dev -pdp_dev_local dp_belleza < "$f"
done

npm run crear-admin -w @dp/backend -- "CI" "$TEST_ADMIN_EMAIL" "$TEST_ADMIN_PASSWORD"
