-- V3__servicios: la categoria de un servicio pasa a ser texto libre.
--
-- En V2 era un ENUM con las 6 categorias del mock del frontend. Ahora los
-- servicios se cargan desde el panel, y la duena tiene que poder escribir una
-- categoria nueva ("Cosmetologia", "Promos de verano") sin que nadie toque el
-- schema. Las categorias ya no se listan en ningun lado: salen de los servicios
-- cargados (SELECT DISTINCT categoria).
--
-- Sigue sin ser una FK a `categorias`, por lo mismo que dice V2: esa tabla es de
-- productos. Para que "masajes" y "Masajes" no terminen siendo dos categorias,
-- el backend reusa la que ya existe cuando coincide sin importar mayusculas ni
-- tildes (la collation utf8mb4_0900_ai_ci compara asi), y el panel la sugiere
-- mientras se escribe.
--
-- El MODIFY conserva los valores que ya estan cargados.

ALTER TABLE servicios
    MODIFY COLUMN categoria VARCHAR(60) NOT NULL;
