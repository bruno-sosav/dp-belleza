-- seed_05: pedidos de la tienda de demostración, ~120 días de historial para que
-- "Ventas tienda" y Finanzas → Análisis tengan algo que mostrar.
--
-- SOLO PARA DESARROLLO Y DEMO. No correr en producción: inventa pedidos.
--
-- Requiere ecommerce-datos-ejemplo (productos) y seed_03_turnos_demo (clientas).
-- No toca el stock: son ventas viejas, el stock de hoy es el que cargó la dueña.
--
-- Reglas que respeta:
--   - hasta 2 pedidos por día, con una regla fija (sin azar: siempre da lo mismo)
--   - nada en el futuro
--   - la mayoría 'entregado'; los de los últimos días 'confirmado' o 'pendiente',
--     y algunos 'cancelado', para que el panel tenga qué mostrar
--   - el precio de cada línea es el del producto, y el total la suma de las líneas

-- 1. Los pedidos, marcados en `notas` para poder colgarles las líneas en el paso 2.
INSERT INTO pedidos (cliente_id, estado, total, notas, created_at, updated_at)
WITH RECURSIVE
dias AS (
    SELECT 0 AS n UNION ALL SELECT n + 1 FROM dias WHERE n < 119
),
pedidos_del_dia AS (
    SELECT n, k
      FROM dias
      CROSS JOIN (SELECT 0 AS k UNION ALL SELECT 1) ks
     -- Casi todos los días hay uno; algunos días, dos.
     WHERE (k = 0 AND (n * 7) % 5 <> 0) OR (k = 1 AND (n * 3) % 4 = 0)
),
clientas AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS i
      FROM clientes
     WHERE telefono LIKE '549223555000%'
)
SELECT c.id,
       CASE
           WHEN p.n = 0                    THEN 'pendiente'
           WHEN p.n <= 4                   THEN 'confirmado'
           WHEN (p.n + p.k) % 11 = 0       THEN 'cancelado'
           ELSE 'entregado'
       END,
       0,
       CONCAT('seed-demo ', p.n, ' ', p.k),
       CASE
           WHEN p.n = 0 THEN NOW() - INTERVAL (1 + p.k) HOUR
           ELSE TIMESTAMP(CURDATE() - INTERVAL p.n DAY, MAKETIME(10 + (p.n * 5 + p.k * 4) % 9, (p.n * 13) % 60, 0))
       END AS creado,
       CASE
           WHEN p.n = 0 THEN NOW() - INTERVAL (1 + p.k) HOUR
           ELSE TIMESTAMP(CURDATE() - INTERVAL p.n DAY, MAKETIME(10 + (p.n * 5 + p.k * 4) % 9, (p.n * 13) % 60, 0))
       END
  FROM pedidos_del_dia p
  JOIN clientas c ON c.i = (p.n * 3 + p.k) % (SELECT COUNT(*) FROM clientas);

-- 2. Las líneas: uno o dos productos por pedido, con el precio del catálogo.
INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
WITH
productos_ordenados AS (
    SELECT id, precio, ROW_NUMBER() OVER (ORDER BY id) - 1 AS i FROM productos
),
total_productos AS (
    SELECT COUNT(*) AS cantidad FROM productos_ordenados
),
semilla AS (
    -- Solo se convierten las notas del paso 1: MySQL puede evaluar el CAST antes que el WHERE.
    SELECT id AS pedido_id,
           CASE WHEN notas LIKE 'seed-demo %' THEN CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(notas, ' ', 2), ' ', -1) AS UNSIGNED) END AS n,
           CASE WHEN notas LIKE 'seed-demo %' THEN CAST(SUBSTRING_INDEX(notas, ' ', -1) AS UNSIGNED) END AS k
      FROM pedidos
     WHERE notas LIKE 'seed-demo %'
),
lineas AS (
    -- Primera línea: siempre. 1 unidad, o 2 cada tanto.
    SELECT pedido_id, (n * 5 + k * 7) AS elegido, 1 + (n % 3 = 0) AS cantidad FROM semilla
    UNION ALL
    -- Segunda línea: en uno de cada tres pedidos, otro producto.
    SELECT pedido_id, (n * 5 + k * 7 + 4) AS elegido, 1 FROM semilla WHERE (n + k) % 3 = 0
)
SELECT l.pedido_id, po.id, l.cantidad, po.precio
  FROM lineas l
  JOIN total_productos t
  JOIN productos_ordenados po ON po.i = l.elegido % t.cantidad;

-- 3. El total de cada pedido es la suma de sus líneas; y una nota creíble.
UPDATE pedidos p
   SET p.total = (SELECT SUM(i.subtotal) FROM pedido_items i WHERE i.pedido_id = p.id),
       p.notas = CASE WHEN p.id % 4 = 0 THEN 'Entrega: envío a domicilio.' ELSE 'Entrega: retira en el local.' END,
       p.updated_at = p.created_at
 WHERE p.notas LIKE 'seed-demo %';
