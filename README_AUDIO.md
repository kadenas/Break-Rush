# Audio Assets for Break Rush

Los archivos de sonido no se incluyen en este repositorio. Para ejecutar `npm run build` o desplegar el juego con audio debes preparar los recursos manualmente.

1. Crea (si no existe) la carpeta `../breakrush_assets/audio/` relativa a la raíz del proyecto.
2. Copia dentro de esa carpeta todos los ficheros `.mp3` y `.ogg` necesarios (por ejemplo, `loop3.mp3`, `loop4.mp3`, etc.).
3. Ejecuta `npm run build`. El script `prebuild` copiará automáticamente los audios a `public/audio/` antes de que Vite genere el bundle.

Durante el despliegue en el servidor Raspberry, asegúrate de colocar los mismos ficheros de audio en la ruta externa correspondiente (por ejemplo `/var/www/breakrush_assets/audio/`) para que el build pueda copiarlos a la carpeta `dist/audio/` o `releases/.../audio/`.

Si la carpeta de origen no existe, el proceso mostrará un aviso en consola pero el build continuará sin fallar.
