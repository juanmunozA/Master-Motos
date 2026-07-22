# Master Motos Medellin - Facturacion

Aplicacion web local en Node.js + React para reemplazar la factura en Excel del taller.

## Estructura

- `frontend/`: frontend React.
- `frontend/src/`: componentes, estilos y entrada de React.
- `frontend/vite.config.js`: configuracion de Vite.
- `frontend/dist/`: frontend React compilado para usar con `npm start`.
- `backend/server.js`: punto de entrada del backend.
- `backend/src/config/`: variables de entorno, rutas del proyecto y conexion PG.
- `backend/src/controllers/`: controladores HTTP.
- `backend/src/models/`: modelos/casos de datos.
- `backend/src/repositories/`: acceso a PostgreSQL y respaldo CSV.
- `backend/src/routes/`: rutas API y archivos estaticos.
- `backend/src/services/`: servicios auxiliares, como respaldo Excel.
- `backend/src/utils/`: utilidades compartidas.
- `backend/data/master-data.csv`: respaldo local o modo archivo.
- `backend/data/master-data.xls`: respaldo legible en Excel cuando se usa modo archivo.
- `backend/scripts/`: tareas de mantenimiento, como migrar CSV a PostgreSQL.
- `legacy/monolith/`: respaldo del monolito anterior.

## Variables de entorno

1. Duplica `.env.example` como `.env`.
2. Configura tu conexion PostgreSQL:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/master_motos
PGSSL=false
```

Valores de `STORAGE_DRIVER`:

- `postgres`: usa PostgreSQL y exige `DATABASE_URL`.
- `file`: usa `backend/data/master-data.csv`.
- `auto`: usa PostgreSQL si hay `DATABASE_URL`; si no, usa CSV.

Si tu proveedor de PostgreSQL requiere SSL, usa `PGSSL=true`.

## Como usar

1. Ejecuta `npm i` una sola vez si no tienes `node_modules`.
2. Ejecuta `npm run build` despues de cambios en React.
3. Ejecuta `npm start` en esta carpeta o abre `Iniciar Master Motos.bat`.
4. Entra a `http://127.0.0.1:8182/`.

Para desarrollo puedes usar `npm run dev`. Eso abre el frontend React en
`http://127.0.0.1:5173/` y conecta con la API local en `http://127.0.0.1:8182/`.

## Funciones

1. La app inicia en `Dashboard`, donde ves resumen de facturas, ingresos e inventario.
2. En `Factura` ves las facturas guardadas en cards; `Crear factura` abre el formulario.
3. En `Ingresos` ves las ordenes guardadas en cards; `Crear ingreso` abre el formulario.
4. Cada card permite abrir el registro anterior para revisarlo o imprimirlo.

No abras archivos HTML directamente si necesitas guardar datos, porque el guardado en
CSV/Excel depende del servidor local Node.js.

## Datos guardados

Con `STORAGE_DRIVER=postgres`, las facturas, ingresos, inventario y datos del taller se guardan en PostgreSQL.

La tabla se crea automaticamente:

```sql
workshop_records
```

Cada registro se guarda con metadatos consultables y el documento completo en `payload jsonb`.

Para migrar los datos actuales del CSV a PostgreSQL:

```bash
npm run migrate:pg
```

En modo archivo, los datos quedan en:

- `backend/data/master-data.csv`
- `backend/data/master-data.xls`

Para que el guardado funcione, abre la app con `npm start`, `npm run dev` o con
`Iniciar Master Motos.bat`.

## Copias y reportes

En la vista `Factura`, el boton `Exportar CSV` descarga un archivo con el resumen
de facturas. Ese archivo se puede abrir en Excel.

## Inventario

En la vista `Inventario` puedes registrar repuestos con codigo, nombre, precio y
stock. Si guardas un repuesto como codigo `002k` y nombre `Balineras`, al escribir
`balineras` o `002k` en una linea de factura aparecera la sugerencia:

`Balineras -- 002k`

Al seleccionar la sugerencia, la factura completa la descripcion y trae el precio
registrado si el precio de la linea esta en cero.

## Orden de ingreso

En la vista `Ingreso` puedes crear una orden para recibir la moto antes de facturar.
La orden guarda numero automatico, fecha, cliente, telefono, moto, placa, motivo de
ingreso y la persona que atiende.

Ejemplo de motivo:

`Pulsar N200 por cambio de aceite`

La orden se puede guardar, consultar despues e imprimir con firma de quien recibe y
del cliente.

## Siguiente mejora recomendada

Agregar descuento automatico de stock al guardar la factura y una alerta de bajo
inventario para repuestos criticos.
