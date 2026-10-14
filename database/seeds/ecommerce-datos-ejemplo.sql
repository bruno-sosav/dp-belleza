-- Datos de ejemplo para la tienda (los mismos productos que muestra hoy el frontend).
-- Solo para desarrollo, no correr en producción.
-- Uso (desde la raíz del repo): mysql dp_belleza < database/seeds/ecommerce-datos-ejemplo.sql

SET NAMES utf8mb4;

INSERT INTO categorias (nombre) VALUES
    ('Skincare'),
    ('Maquillaje'),
    ('Cabello'),
    ('Perfumes'),
    ('Cuidado Corporal');

INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, imagen_url) VALUES
    ((SELECT id FROM categorias WHERE nombre = 'Skincare'), 'Sérum Facial Vitamina C',
     'Sérum iluminador con vitamina C estabilizada al 15% que unifica el tono de la piel, reduce manchas y aporta luminosidad desde la primera aplicación.',
     18900.00, 20, 'https://picsum.photos/seed/serum-vitc/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Skincare'), 'Crema Hidratante Ácido Hialurónico',
     'Hidratación profunda de 24hs gracias a su fórmula con tres pesos moleculares de ácido hialurónico. Textura liviana, apta para todo tipo de piel.',
     15500.00, 20, 'https://picsum.photos/seed/crema-hialuronico/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Maquillaje'), 'Paleta de Sombras Nude Edition',
     '12 tonos mate y shimmer en una paleta versátil pensada para looks de día y de noche. Alta pigmentación y larga duración.',
     21900.00, 20, 'https://picsum.photos/seed/paleta-nude/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Maquillaje'), 'Labial Líquido Mate',
     'Color intenso de acabado mate aterciopelado con fórmula libre de resecado. Disponible en 10 tonalidades.',
     8900.00, 20, 'https://picsum.photos/seed/labial-mate/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Cabello'), 'Shampoo Reparador Keratina',
     'Limpieza suave con keratina hidrolizada que repara la fibra capilar y devuelve brillo y suavidad al cabello dañado.',
     12300.00, 20, 'https://picsum.photos/seed/shampoo-keratina/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Cabello'), 'Aceite Capilar Nutritivo',
     'Mezcla de aceites de argán y macadamia que nutre puntas abiertas y controla el frizz sin apelmazar.',
     9800.00, 20, 'https://picsum.photos/seed/aceite-capilar/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Perfumes'), 'Perfume Floral Intenso 50ml',
     'Fragancia floral con notas de jazmín, peonía y un fondo amaderado cálido. Larga duración, ideal para el día a día.',
     32900.00, 20, 'https://picsum.photos/seed/perfume-floral/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Perfumes'), 'Eau de Parfum Ámbar',
     'Composición oriental con ámbar, vainilla y especias suaves. Un aroma envolvente pensado para la noche.',
     28500.00, 20, 'https://picsum.photos/seed/perfume-ambar/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Cuidado Corporal'), 'Manteca Corporal Karité',
     'Manteca corporal 100% natural que nutre profundamente la piel seca y deja un aroma suave y duradero.',
     11200.00, 20, 'https://picsum.photos/seed/manteca-karite/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Cuidado Corporal'), 'Exfoliante Corporal de Café',
     'Exfoliante con granos de café y aceites esenciales que renueva la piel y estimula la circulación.',
     9400.00, 20, 'https://picsum.photos/seed/exfoliante-cafe/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Maquillaje'), 'Base Líquida Cobertura Media',
     'Base de cobertura media a alta, acabado natural. Disponible en 20 tonos con protección solar SPF 15.',
     17300.00, 20, 'https://picsum.photos/seed/base-liquida/600/750'),
    ((SELECT id FROM categorias WHERE nombre = 'Skincare'), 'Protector Solar Facial FPS 50',
     'Protección de amplio espectro con textura ligera y acabado invisible, apto para uso diario bajo maquillaje.',
     14700.00, 20, 'https://picsum.photos/seed/protector-solar/600/750');
