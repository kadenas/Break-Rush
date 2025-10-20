# Break Rush

Break Rush es un juego web *mobile-first* construido con Vite + TypeScript. Todo el arte se genera por código en Canvas 2D y los efectos de sonido se crean en tiempo real con WebAudio. El repositorio no contiene archivos binarios: los íconos PNG se generan tras el build.

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior

## Scripts disponibles

| Comando            | Descripción |
| ------------------ | ----------- |
| `npm install`      | Instala las dependencias. |
| `npm run dev`      | Ejecuta el servidor de desarrollo de Vite en `http://localhost:5173`. |
| `npm run build`    | Genera la compilación de producción y ejecuta el postbuild para producir íconos PNG en `dist/icons/`. |
| `npm run preview`  | Sirve el build final para pruebas locales. |
| `npm run lint`     | Ejecuta `tsc --noEmit` para comprobar el tipado del proyecto. |

Tras `npm run build` encontrarás los PNG en `dist/icons/` y el `manifest.webmanifest` apuntará automáticamente a esos archivos.

## Estructura del proyecto

```
public/
  manifest.webmanifest
  icons/app.svg
src/
  core/           # Bucle de juego
  engine/         # Entrada, audio, haptics y canvas
  game/           # Estados, mundo y gestor principal
  gfx/            # Rutinas de renderizado procedural
  storage/        # Persistencia de récord y ajustes
  ui/             # Temas de color
  pwa/            # Registro y service worker
  build/          # Script postbuild e encoder PNG
index.html
vite.config.ts
```

## Características

- Juego responsivo orientado a retrato, con escalado por DPR y respeto a las *safe areas*.
- Control táctil con arrastre de un dedo, tap en tres carriles opcional y soporte completo para teclado en escritorio.
- Detección de toque con dos dedos para pausar, y botones grandes en el canvas para Pausa/Reintento.
- Sistema de estados: menú, juego, pausa y game over.
- Enemigos que entran por los bordes con dificultad progresiva, orbes de puntuación y *power-ups* (ralentización, escudo, bomba).
- Multiplicadores por *near miss* con halo visual y vibración opcional.
- HUD de alto contraste con tema alternativo para daltonismo, configuraciones persistidas de audio, haptics y modo por carriles.
- PWA con service worker modular y manifest reescrito en build para aprovechar los íconos generados.

## Generador de íconos PNG

El script `src/build/postbuild.mjs` incluye un encoder PNG en JavaScript puro. Tras `npm run build`:

1. Se crean los íconos de 192×192 y 512×512 px dentro de `dist/icons/`.
2. Se reescribe `dist/manifest.webmanifest` para que apunte a esos nuevos íconos.

> Nota: los PNG no forman parte del repositorio y deben generarse localmente.

## Política sin binarios

- `.gitattributes` marca las extensiones binarias típicas como binarias para evitar falsos positivos.
- El hook `scripts/pre-commit` bloquea cualquier commit que incluya archivos detectados como binarios por `git diff --numstat`.
- Para activarlo ejecuta una vez:

```bash
git config core.hooksPath scripts
git config --add core.hooksPath .git/hooks  # opcional si prefieres copiarlo manualmente
```

O bien copia `scripts/pre-commit` a `.git/hooks/pre-commit` y dale permisos de ejecución.

## Despliegue

### Servidor estático rápido (por ejemplo, pruebas en Raspberry Pi)

1. Ejecuta `npm run build` en tu máquina de desarrollo o directamente en la Raspberry Pi.
2. Copia la carpeta `dist/` al dispositivo objetivo.
3. Inicia un servidor estático, por ejemplo:

```bash
python3 -m http.server 8080 --directory dist
```

Accede desde el navegador de la Raspberry a `http://<ip>:8080`.

### Nginx en Raspberry Pi

1. Instala nginx (`sudo apt install nginx`).
2. Copia el contenido de `dist/` a `/var/www/break-rush`:

```bash
sudo mkdir -p /var/www/break-rush
sudo cp -r dist/* /var/www/break-rush/
```

3. Crea un bloque de servidor en `/etc/nginx/sites-available/break-rush`:

```
server {
    listen 80;
    server_name _;
    root /var/www/break-rush;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    types {
        application/manifest+json webmanifest;
        image/svg+xml svg;
    }
}
```

4. Habilita el sitio y reinicia nginx:

```bash
sudo ln -s /etc/nginx/sites-available/break-rush /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

El juego quedará disponible en la IP de la Raspberry Pi. Al ser contenido puramente estático, no hay dependencias adicionales.

## Accesibilidad y ajustes

- Pulsa `M` para alternar el audio, `H` para vibración, `T`/`C` para cambiar de tema y `L` para activar el modo de carriles.
- Las preferencias se guardan en `localStorage` y se aplican automáticamente al volver a abrir el juego.
- En escritorio se puede jugar con teclado (`WASD` o flechas) y barra espaciadora/Escape para pausar.

## Desarrollo futuro

- Ajustar patrones de enemigos para sesiones más largas.
- Añadir tabla de récords locales por duración y combos máximos.
- Incluir pruebas unitarias para la lógica de generación procedural.

¡Disfruta Break Rush sin binarios en el repositorio!
