# Resumen del Proyecto — SD4A Client Portal

> Última actualización: 14 de julio de 2026

## Objetivo

Portal web (ERP ligero) para SD4A Ingeniería Estructural que permite:
- **Clientes**: ver el avance de sus proyectos, descargar archivos (solo con saldo pagado) y pagar por Wompi (PSE, Nequi, Bancolombia) con opción de factura electrónica.
- **Administrador**: gestionar proyectos, clientes, ingenieros, pagos, archivos y ver el log de actividad.
- **Ingenieros**: ver sus proyectos asignados y subir archivos.

**Stack**: Next.js 15 + TypeScript en Vercel (`pagos-sd-4-a.vercel.app`) · FastAPI + Python en Railway · PostgreSQL · Google Drive para archivos · Wompi para pagos · Brevo/SMTP para correos.

**Marca**: Visby CF, colores `#0A7881` (teal), `#68B2B7` (cyan), `#9BE3BF` (mint).

## Estado actual

Funcional y desplegado en producción. Últimos avances de esta sesión (todos pusheados a `main`):

1. **Logo**: se usa `apps/web/public/portal-logo.png` (archivo del usuario "PORTAL LOGO.png") en sidebar y topbar, con banda blanca de 56px alineada al TopBar.
2. **UI premium**: sombras con tinte de marca, tarjetas KPI con acento de color, skeletons animados de carga, estados de error con botón "Reintentar", scrollbar y selección personalizados.
3. **Seguridad (auditoría completa)**:
   - Webhook Wompi: firma obligatoria + validación de monto + comparación en tiempo constante.
   - Control de acceso en `/activity/project/{id}` (los clientes solo ven su proyecto).
   - Contraseñas mínimo 8 caracteres en todas las rutas; cambio/reset invalida sesiones abiertas.
   - Lista de tipos MIME aplicada en subidas; nombres de archivo sanitizados (inyección de cabeceras).
   - Correos con HTML escapado (anti-phishing); esquemas Pydantic tipados en vez de `dict` crudo.
4. **Facturación electrónica**: toggle en el modal de pago con empresa, NIT, **correo (obligatorio) y teléfono (opcional)** + botón "Usar los de mi cuenta". Los datos van a Wompi (`customer-data:*`) y se guardan en BD (`billing_company/nit/email/phone`).
5. **Sección admin "Datos de facturación electrónica"** debajo de la tarjeta de Pagos, con cuadrícula de razón social / NIT / correo / teléfono por solicitud.
6. **UX**: paginación en Actividad (25/pág), favicon de marca (pórtico), imagen Open Graph, campana de notificaciones oculta para clientes (eliminó spam de 403).
7. **Manual de usuario Cliente**: `C:\Users\Usuario\Desktop\Manual_Usuario_SD4A.docx` generado y aprobado.

## Archivos principales trabajados

| Área | Archivos |
|------|----------|
| Layout/marca | `apps/web/src/components/layout/SidebarNav.tsx`, `TopBar.tsx`, `SD4ALogo.tsx` (obsoleto, ya no se usa), `apps/web/public/portal-logo.png` |
| Dashboards | `apps/web/src/components/dashboard/AdminDashboard.tsx`, `EngineerDashboard.tsx`, `ClientDashboard.tsx` |
| Pagos/facturación | `apps/web/src/components/payments/PaymentsSection.tsx`, `apps/web/src/types/payment.ts`, `apps/api/api/v1/endpoints/payments.py`, `apps/api/core/wompi.py`, `apps/api/models/payment.py`, `apps/api/schemas/payment.py` |
| Seguridad | `apps/api/api/v1/endpoints/{files,deliverables,activity,users}.py`, `apps/api/schemas/user.py`, `apps/api/core/email.py`, `apps/api/deps.py` |
| UI base | `apps/web/src/app/globals.css`, `apps/web/src/components/ui/{Skeleton,ErrorState,Pagination}.tsx` |
| Metadata | `apps/web/src/app/{layout,icon,apple-icon,opengraph-image}.tsx` |
| Migraciones | `apps/api/main.py` (ALTER TABLE idempotentes en lifespan) |
| Manual Word | script en scratchpad `build-manual-v2.js` (usa paquete `docx` global de npm) |

## Qué se intentó y qué falló (lecciones)

- **Logo SVG generado** (2 intentos: hexágono/rombo y pórtico estructural): el usuario los rechazó por verse "pixelados/feos". **Solución final**: usar el PNG real del usuario (`PORTAL LOGO.png`) sobre fondo blanco alineado con el topbar.
- **Word corrupto (1er intento)**: `TabStopPosition.MAX` genera XML inválido → usar valor numérico DXA (9026 para A4 con márgenes de 1").
- **Word corrupto (2º intento)**: `ImageRun.transformation` recibe **píxeles**, no EMU (docx-js multiplica ×9525 internamente). Fórmula: pulgadas × 96 = px.
- **Toggle sin animar**: `translate-x-5.5` no es clase Tailwind válida → usar `style={{ left: ... }}` inline.
- **Push silenciosamente fallido**: 4 commits quedaron locales sin llegar a Vercel; el usuario veía "lo mismo". Verificar siempre que `git push` salga en el output.
- **Edición de archivo con heredoc Python**: corrompió `deliverables.py` con bytes nulos (encoding). Restaurado con `git checkout` y editado con la herramienta Edit.
- **Spam de 403 en consola**: la campana de notificaciones consultaba `/activity` (solo admin/ingeniero) para todos los roles cada 30s.

## Próximos pasos (pendientes)

1. **Manual Word de Administrador** — con capturas propias del panel admin (prometido, no iniciado).
2. **Manual Word de Ingenieros** — igual (prometido, no iniciado).
3. **Recordatorios automáticos de pago** — correo al cliente cuando un pago lleva X días pendiente.
4. **Recibo/constancia de pago en PDF** al confirmarse un pago.
5. **Flujo "crear tu contraseña"** — hoy el correo de bienvenida envía la contraseña en texto plano; reemplazar por enlace con token que expira (recomendación de seguridad pendiente).
6. **Backups de PostgreSQL** — verificar backups automáticos en Railway.
7. **Refresh token silencioso** — el JWT expira a los 60 min y expulsa al usuario en seco.
8. **Verificar en producción**: que `WOMPI_EVENTS_SECRET` esté configurado en Railway (si falta, el webhook rechaza todo con 503 y solo funciona la confirmación manual).
