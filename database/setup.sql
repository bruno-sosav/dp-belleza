-- Arranque de la base. Se corre UNA sola vez, como root:
--
--     mysql -u root -p < database/setup.sql
--
-- Crear una base y un usuario son operaciones de root: no hay forma de hacerlas
-- desde la aplicacion. Lo que sigue (tablas, migraciones, datos) ya va con
-- dp_dev, asi que este es el unico momento en que hace falta la clave de root.

CREATE DATABASE IF NOT EXISTS dp_belleza
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------------------
-- dp_app — el usuario con el que se conecta el BACKEND.
--
-- Solo datos: SELECT, INSERT, UPDATE, DELETE. Sin CREATE, ALTER ni DROP, asi
-- un bug en la API no se puede llevar una tabla puesta. Es el que esta en
-- backend/.env.local.
-- -------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'dp_app'@'localhost' IDENTIFIED BY 'dp_app_local';
GRANT SELECT, INSERT, UPDATE, DELETE ON dp_belleza.* TO 'dp_app'@'localhost';

-- -------------------------------------------------------------------------
-- dp_dev — el usuario de DESARROLLO, para correr migraciones y seeds.
--
-- Tiene todo sobre dp_belleza y nada sobre el resto del MySQL: puede crear y
-- modificar las tablas del proyecto, pero no tocar otras bases ni crear
-- usuarios. Es lo que permite correr las migraciones sin la clave de root.
--
-- SOLO PARA DESARROLLO LOCAL. En un servidor real las migraciones las corre una
-- persona, a mano, y este usuario no existe.
-- -------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'dp_dev'@'localhost' IDENTIFIED BY 'dp_dev_local';
GRANT ALL PRIVILEGES ON dp_belleza.* TO 'dp_dev'@'localhost';

FLUSH PRIVILEGES;
