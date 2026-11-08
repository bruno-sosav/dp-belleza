CREATE DATABASE IF NOT EXISTS dp_belleza
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;


CREATE USER IF NOT EXISTS 'dp_app'@'localhost' IDENTIFIED BY 'dp_app_local';
GRANT SELECT, INSERT, UPDATE, DELETE ON dp_belleza.* TO 'dp_app'@'localhost';

CREATE USER IF NOT EXISTS 'dp_dev'@'localhost' IDENTIFIED BY 'dp_dev_local';
GRANT ALL PRIVILEGES ON dp_belleza.* TO 'dp_dev'@'localhost';

FLUSH PRIVILEGES;
