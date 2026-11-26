# Classroom Audit

Aplicación web de solo lectura para revisar cursos de Google Classroom, identificar observaciones de contenido y exportar informes CSV.

## Archivos

- `index.html`: estructura del panel.
- `styles.css`: diseño adaptable, modo claro y modo oscuro.
- `app.js`: navegación, filtros, checklist manual, panel y exportación.
- `google-auth.js`: autenticación OAuth mediante Google Identity Services.
- `classroom-api.js`: consultas paginadas a Google Classroom API.
- `audit-engine.js`: reglas de evaluación de cursos y contenido.
- `course-detail.js`: renderizado del detalle de auditoría.

## Requisitos de Google

1. Crear o seleccionar un proyecto en Google Cloud.
2. Habilitar **Google Classroom API**.
3. Configurar la pantalla de consentimiento OAuth.
4. Configurar un cliente OAuth de tipo **Aplicación web**.
5. Agregar el origen desde el que se publicará la aplicación en **Orígenes autorizados de JavaScript**.
6. Verificar que el Client ID configurado en `google-auth.js` corresponda al proyecto de Google Cloud utilizado.

La aplicación solicita permisos de solo lectura para cursos, temas, materiales, actividades y anuncios. El navegador conserva únicamente un indicador de autorización; el Access Token permanece en memoria y no se guarda en `localStorage`.

## Ejecución local

No abras `index.html` directamente con `file://`. Inicia un servidor web desde esta carpeta:

```bash
python -m http.server 5500
```

Luego abre:

```text
http://localhost:5500
```

Agrega `http://localhost:5500` a los orígenes autorizados de JavaScript del cliente OAuth. También puedes utilizar Live Server, siempre que autorices exactamente el origen y puerto que utiliza.

## Alcance de auditoría

Se recuperan y auditan **todos los cursos activos** visibles para la cuenta de Google conectada. Los siguientes códigos permiten identificar el semestre de algunos cursos, pero no se utilizan para excluir otros cursos:

- `ASE261_POO` — SP1, segundo semestre.
- `ASE252_PFE` — SP2, tercer semestre.
- `ASE251_DAM` — SP3, cuarto semestre.
- `ASE242_SDE` — SP4, quinto semestre.

Los cursos sin uno de esos códigos también aparecen en el listado y en los informes; su semestre se muestra como no identificado.

## Sincronización y autorización

Por seguridad, Google Identity Services entrega un token de acceso temporal que se mantiene en memoria. Al recargar la página, el token no se conserva; se debe pulsar **Conectar Google** nuevamente. Si la autorización anterior sigue vigente, Google puede no volver a solicitar el consentimiento, pero sí debe emitir un nuevo token.

La aplicación no crea, modifica ni elimina cursos o contenido en Google Classroom.

## Informes

Desde el panel se pueden descargar:

- Informe general: estado por curso, checklist y métricas.
- Informe detallado: temas, materiales, actividades, anuncios y observaciones.

Los archivos se exportan en CSV con separador `;` y codificación UTF-8 con BOM para facilitar su apertura en hojas de cálculo.
