# Guía de Despliegue - IsoGuard Audit

## ✅ Estado Actual del Despliegue

### Completado con Éxito

- ✅ **Proyecto Cloudflare Pages creado**: `isoguard-audit`
- ✅ **Base de datos D1 creada**: `isoguard-audit-production` (ID: 96769fe0-3fcc-464b-9b3b-29ce0099ab5f)
- ✅ **Migraciones aplicadas** en base de datos remota
- ✅ **Datos de prueba cargados** (35 registros insertados)
- ✅ **Aplicación desplegada** en Cloudflare Pages
- ✅ **Build exitoso**: dist/_worker.js (57.07 kB)

### URLs de Producción

- **URL Principal**: https://isoguard-audit.pages.dev
- **URL de Despliegue Actual**: https://bd75f539.isoguard-audit.pages.dev
- **Dashboard Cloudflare**: https://dash.cloudflare.com/

---

## ⚠️ Paso Crítico Pendiente: Vincular Base de Datos D1

**La aplicación está desplegada pero la base de datos D1 NO está vinculada automáticamente.**

Para que la aplicación funcione correctamente en producción, debes vincular manualmente la base de datos:

### Instrucciones Paso a Paso

1. **Accede al Dashboard de Cloudflare**
   - URL: https://dash.cloudflare.com/
   - Inicia sesión con: douglashenao23@gmail.com

2. **Navega a tu Proyecto**
   - En el menú lateral, selecciona **Workers & Pages**
   - Busca y haz clic en **isoguard-audit**

3. **Accede a Configuración**
   - Haz clic en la pestaña **Settings**
   - Desplázate hasta **Functions**

4. **Añade el Binding de D1**
   - En la sección **D1 database bindings**, haz clic en **Add binding**
   - Completa los campos:
     - **Variable name**: `DB` (exactamente como está escrito)
     - **D1 database**: Selecciona `isoguard-audit-production` del dropdown
   - Haz clic en **Save**

5. **Redespliega (si es necesario)**
   - Si ves un mensaje indicando que necesitas redesplegar, haz clic en **Redeploy**
   - O simplemente espera; el próximo despliegue aplicará los cambios

6. **Verifica que Funciona**
   - Visita: https://isoguard-audit.pages.dev
   - Deberías ver el dashboard con estadísticas
   - Prueba la API: https://isoguard-audit.pages.dev/api/dashboard/stats
   - Deberías recibir un JSON con los datos

---

## 🔍 Verificación del Despliegue

### Pruebas a Realizar

```bash
# 1. Verificar que la página principal carga
curl -I https://isoguard-audit.pages.dev/

# 2. Probar endpoint de API
curl https://isoguard-audit.pages.dev/api/dashboard/stats

# 3. Verificar lista de auditorías
curl https://isoguard-audit.pages.dev/api/audits

# 4. Verificar controles ISO
curl https://isoguard-audit.pages.dev/api/controls
```

### Respuestas Esperadas

**Dashboard Stats (`/api/dashboard/stats`):**
```json
{
  "totalAudits": 1,
  "activeAudits": 1,
  "totalFindings": 3,
  "openFindings": 2,
  "findingsBySeverity": [...],
  "complianceOverview": [...]
}
```

**Audits (`/api/audits`):**
```json
[
  {
    "id": 1,
    "title": "Auditoría Interna Q1 2025",
    "status": "active",
    "auditor_name": "Douglas - Consultor ISO 27001"
  }
]
```

---

## 🔄 Redeployment (si necesitas actualizar)

Si haces cambios en el código y quieres redesplegar:

```bash
# 1. Build del proyecto
npm run build

# 2. Deploy a Cloudflare Pages
npx wrangler pages deploy dist --project-name isoguard-audit

# O usa el script npm
npm run deploy:prod
```

---

## 🗄️ Gestión de Base de Datos D1

### Información de la Base de Datos

- **Nombre**: isoguard-audit-production
- **Database ID**: 96769fe0-3fcc-464b-9b3b-29ce0099ab5f
- **Región**: ENAM (Eastern North America)
- **Tamaño**: ~0.09 MB
- **Tablas**: 8 (users, audits, iso_controls, documents, findings, compliance_assessments, reports, migrations)
- **Registros**: 35 (datos de prueba precargados)

### Comandos Útiles de D1

```bash
# Ver estado de la base de datos
npx wrangler d1 info isoguard-audit-production

# Ejecutar query en producción
npx wrangler d1 execute isoguard-audit-production --remote --command="SELECT COUNT(*) FROM audits"

# Ver todas las auditorías
npx wrangler d1 execute isoguard-audit-production --remote --command="SELECT * FROM audits"

# Ver todos los hallazgos
npx wrangler d1 execute isoguard-audit-production --remote --command="SELECT * FROM findings"

# Aplicar nuevas migraciones
npx wrangler d1 migrations apply isoguard-audit-production --remote
```

---

## 📊 Datos de Prueba Incluidos

La base de datos de producción incluye:

### Usuario Demo
- **Email**: douglas@isoguard.app
- **Nombre**: Douglas - Consultor ISO 27001
- **Rol**: admin

### Auditoría de Ejemplo
- **Título**: Auditoría Interna Q1 2025
- **Estado**: active
- **Alcance**: Todos los controles del Anexo A

### 22 Controles ISO 27001:2022
Categorías incluidas:
- Controles organizacionales (A.5.x)
- Controles de personas (A.6.x)
- Controles físicos (A.7.x)
- Controles tecnológicos (A.8.x)

### 3 Hallazgos de Ejemplo
1. **Gap Crítico**: Política desactualizada (severidad: high)
2. **Observación**: Segregación de funciones mejorable (severidad: medium)
3. **Fortaleza**: Excelente programa de formación (severidad: low)

### 4 Evaluaciones de Cumplimiento
- 2 controles en estado "compliant"
- 2 controles en estado "partial"

---

## 🐛 Solución de Problemas

### Problema: La API devuelve errores 500

**Causa**: La base de datos D1 no está vinculada correctamente.

**Solución**: 
1. Sigue las instrucciones de "Vincular Base de Datos D1" arriba
2. Asegúrate de que el binding se llame exactamente `DB`
3. Redespliega si es necesario

### Problema: No veo datos en el dashboard

**Causa**: La base de datos no tiene datos o no está conectada.

**Solución**:
1. Verifica que la base de datos esté vinculada
2. Ejecuta el seed nuevamente:
   ```bash
   npx wrangler d1 execute isoguard-audit-production --remote --file=./seed.sql
   ```

### Problema: Error al desplegar

**Causa**: Credenciales de Cloudflare expiradas o incorrectas.

**Solución**:
1. Verifica autenticación: `npx wrangler whoami`
2. Si es necesario, reconfigura: exporta `CLOUDFLARE_API_TOKEN` nuevamente

---

## 📝 Próximos Pasos Recomendados

### Funcionalidades Adicionales

1. **Implementar Autenticación Real**
   - Integrar con Cloudflare Access
   - O usar Auth0 / Clerk para gestión de usuarios
   - Proteger rutas de API

2. **Carga Real de Documentos**
   - Configurar Cloudflare R2 para almacenamiento
   - Implementar upload de PDF/DOCX/XLSX
   - Parser de documentos con Workers AI

3. **Análisis con IA**
   - Integrar Cloudflare Workers AI
   - O conectar con OpenAI API
   - Análisis automático de cumplimiento

4. **Exportación de Informes**
   - Generar PDFs con jsPDF
   - Crear plantillas de informes ejecutivos
   - Exportar datos a Excel

5. **Notificaciones**
   - Enviar emails con Resend o SendGrid
   - Alertas de hallazgos críticos
   - Recordatorios de auditorías

### Mejoras de UX/UI

- Búsqueda y filtrado avanzado
- Gráficos más sofisticados (Chart.js)
- Modo oscuro
- Responsividad mejorada
- PWA completa (service workers)

### Integración con GitHub

Para versionar el código en GitHub:

1. Ve a la pestaña #github en la interfaz
2. Completa la autorización de GitHub
3. Crea o selecciona un repositorio
4. Ejecuta:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/isoguard-audit.git
   git push -f origin main
   ```

---

## 📦 Backups Disponibles

- **Versión inicial**: https://www.genspark.ai/api/files/s/np5gDRUj
- **Versión desplegada**: https://www.genspark.ai/api/files/s/hMCZFKXi

---

## 📞 Soporte

Para cualquier problema o pregunta:
- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **D1 Database Docs**: https://developers.cloudflare.com/d1/
- **Workers AI Docs**: https://developers.cloudflare.com/workers-ai/

---

**Desarrollado para**: Douglas - Consultor de Seguridad ISO 27001:2022

**Fecha de Despliegue**: 2025-11-22
**Versión**: 1.0.0
**Estado**: ✅ Desplegado (pendiente vincular D1)
