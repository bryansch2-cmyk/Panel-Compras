# Panel Compras Web

Version web del panel de tarjetas para usarlo desde navegador y compartirlo entre 2 PCs.

## Stack

- Frontend: HTML + CSS + JavaScript
- Backend: Node.js
- Storage actual: JSON

## Estructura

- `frontend/`
  Interfaz web
- `backend/`
  API y reglas de negocio
- `backend/data/state.json`
  Estado local de desarrollo

## Desarrollo local

### Opcion simple

Ejecuta:

`C:\Users\Usuario\Desktop\Fortnitebot\panel-compras-web\start-backend.ps1`

Luego abre:

[http://localhost:4100/](http://localhost:4100/)

### Opcion manual

1. Abre una terminal en:

`C:\Users\Usuario\Desktop\Fortnitebot\panel-compras-web`

2. Ejecuta:

```powershell
npm start
```

3. Abre:

[http://localhost:4100/](http://localhost:4100/)

## Deploy en Railway

### Lo que necesita Railway

- Root del proyecto: `panel-compras-web`
- Start command: `npm start`
- Node 18 o superior
- Un volumen persistente

### Configuracion recomendada

1. Sube esta carpeta a GitHub.
2. En Railway crea un nuevo proyecto desde ese repo.
3. En el servicio monta un volumen persistente, por ejemplo en:

`/data`

4. Crea esta variable de entorno:

`DATA_DIR=/data`

Con eso, el archivo `state.json` dejara de vivir dentro del deploy y pasara a vivir en el volumen persistente.

### URL compartida

Una vez desplegado, Railway te dara una URL publica. Esa sera la direccion que abriran ambas PCs.

## Importante

Con esta arquitectura:

- si corre en tu PC, tu PC debe estar encendida
- si corre en Railway, funcionara aunque tu PC este apagada

## Siguiente mejora recomendada

Cuando el panel ya este estable online, conviene cambiar de `JSON` a `SQLite` para tener una persistencia mas fuerte para uso simultaneo.
