-- Seed data for IsoGuard Audit

-- Insert demo user
INSERT OR IGNORE INTO users (id, email, name, password_hash, role) VALUES 
  (1, 'douglas@isoguard.app', 'Douglas - Consultor ISO 27001', '$2a$10$demo.hash.password', 'admin');

-- Insert ISO 27001:2022 controls (Annex A)
INSERT OR IGNORE INTO iso_controls (control_id, control_name, category, description) VALUES 
  ('A.5.1', 'Políticas de seguridad de la información', 'Controles organizacionales', 'Definir y aprobar políticas de seguridad'),
  ('A.5.2', 'Roles y responsabilidades de seguridad', 'Controles organizacionales', 'Asignar responsabilidades de seguridad'),
  ('A.5.3', 'Segregación de funciones', 'Controles organizacionales', 'Separar funciones conflictivas'),
  ('A.5.7', 'Inteligencia de amenazas', 'Controles organizacionales', 'Recopilar y analizar amenazas'),
  ('A.5.10', 'Uso aceptable de la información', 'Controles organizacionales', 'Reglas de uso de activos'),
  ('A.5.14', 'Transferencia de información', 'Controles organizacionales', 'Reglas para transferencia segura'),
  ('A.6.1', 'Selección de personal', 'Controles de personas', 'Verificación de antecedentes'),
  ('A.6.2', 'Términos y condiciones de empleo', 'Controles de personas', 'Acuerdos de confidencialidad'),
  ('A.6.3', 'Concienciación y formación', 'Controles de personas', 'Capacitación en seguridad'),
  ('A.7.1', 'Espacios físicos seguros', 'Controles físicos', 'Protección de áreas sensibles'),
  ('A.7.2', 'Controles de entrada física', 'Controles físicos', 'Control de acceso físico'),
  ('A.7.4', 'Monitoreo de seguridad física', 'Controles físicos', 'Vigilancia y alarmas'),
  ('A.8.1', 'Dispositivos de usuario final', 'Controles tecnológicos', 'Gestión de equipos'),
  ('A.8.2', 'Derechos de acceso privilegiado', 'Controles tecnológicos', 'Control de privilegios'),
  ('A.8.3', 'Restricción de acceso a la información', 'Controles tecnológicos', 'Control de acceso lógico'),
  ('A.8.5', 'Autenticación segura', 'Controles tecnológicos', 'Métodos de autenticación robustos'),
  ('A.8.8', 'Gestión de vulnerabilidades técnicas', 'Controles tecnológicos', 'Parcheo y actualización'),
  ('A.8.9', 'Gestión de configuración', 'Controles tecnológicos', 'Configuración segura'),
  ('A.8.10', 'Eliminación de información', 'Controles tecnológicos', 'Borrado seguro de datos'),
  ('A.8.16', 'Actividades de monitoreo', 'Controles tecnológicos', 'Registro y supervisión'),
  ('A.8.23', 'Filtrado web', 'Controles tecnológicos', 'Control de navegación'),
  ('A.8.26', 'Requisitos de seguridad de aplicaciones', 'Controles tecnológicos', 'Desarrollo seguro');

-- Insert demo audit
INSERT OR IGNORE INTO audits (id, title, description, scope, audit_date, status, user_id) VALUES 
  (1, 'Auditoría Interna Q1 2025', 'Evaluación de cumplimiento ISO 27001:2022 - Primer Trimestre', 'Todos los controles del Anexo A', '2025-03-15', 'active', 1);

-- Insert demo documents
INSERT OR IGNORE INTO documents (id, audit_id, document_name, document_type, file_size, status) VALUES 
  (1, 1, 'Política de Seguridad de la Información v2.0.pdf', 'policy', 245678, 'analyzed'),
  (2, 1, 'Procedimiento de Control de Acceso.pdf', 'procedure', 189234, 'analyzed'),
  (3, 1, 'Matriz de Roles y Responsabilidades.xlsx', 'evidence', 98456, 'pending');

-- Insert demo findings
INSERT OR IGNORE INTO findings (id, audit_id, control_id, finding_type, severity, title, description, recommendation, status) VALUES 
  (1, 1, 1, 'gap', 'high', 'Política desactualizada', 'La política de seguridad no incluye referencias a ISO 27001:2022', 'Actualizar la política para incluir todos los controles del Anexo A actualizados', 'open'),
  (2, 1, 3, 'observation', 'medium', 'Segregación de funciones mejorable', 'Algunos usuarios tienen privilegios que podrían consolidarse', 'Revisar matriz de segregación de funciones y aplicar principio de mínimo privilegio', 'open'),
  (3, 1, 9, 'strength', 'low', 'Excelente programa de formación', 'El programa de concienciación en seguridad es robusto y bien documentado', 'Continuar con el programa actual y considerar añadir simulaciones de phishing', 'closed');

-- Insert demo compliance assessments
INSERT OR IGNORE INTO compliance_assessments (audit_id, control_id, compliance_level, evidence, notes) VALUES 
  (1, 1, 'partial', 'Política v2.0 presente pero requiere actualización', 'Necesita revisión para ISO 27001:2022'),
  (1, 2, 'compliant', 'Matriz de roles aprobada y actualizada', 'Cumplimiento total'),
  (1, 3, 'partial', 'Segregación implementada pero mejorable', 'Revisar casos específicos'),
  (1, 9, 'compliant', 'Programa de formación documentado con registros', 'Excelente implementación');
