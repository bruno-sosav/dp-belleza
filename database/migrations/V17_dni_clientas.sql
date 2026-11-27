-- V17: DNI de las clientas. La reserva web arranca pidiéndolo y con él la reconoce.
--
-- Opcional (las fichas viejas y las del panel no lo tienen) y único: un DNI es una persona.

ALTER TABLE clientes
  ADD COLUMN dni VARCHAR(8) NULL AFTER apellido,
  ADD UNIQUE KEY uq_clientes_dni (dni);
