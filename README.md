## Laboratorio de redes (pasos 4 y 5)

Copia el repositorio en `C:\laragon\www\aula-3d`, inicia Apache en Laragon y abre [el laboratorio de redes](http://localhost:8081/aula-3d/laboratorio/). Si Apache usa el puerto 80, quita `:8081` de la dirección. El laboratorio incluye Three.js y funciona con PHP sin instalar paquetes ni importar la base de datos del campus.

Si usas el ZIP de Laragon incluido en el repositorio, extrae el contenido de su carpeta `aula817` en `C:\laragon\www\aula-3d`. Puedes entrar desde el enlace **Laboratorio de redes** en el inicio de sesión o en el portal.

1. Haz clic en el monitor o en la mesa de una de las 24 PC. También puedes elegirla en **Puestos**.
2. Registra tu nombre, IPv4 y MAC y pulsa **Guardar configuración**. Cada pantalla muestra los datos de su puesto.
3. Desde tu PC, elige la de un compañero y pulsa **Hacer ping**. El juego simula cuatro paquetes entre puestos registrados de la misma subred `/24`. Un puesto vacío o en otra subred devuelve cuatro pérdidas.

Para compartir la misma aula, todos abren `http://IP-DEL-SERVIDOR:8081/aula-3d/laboratorio/` en la red local. Sustituye `IP-DEL-SERVIDOR` por la IPv4 del equipo que ejecuta Laragon.

## Campus y multijugador

-- Usar Laragon
Abre Laragon → Terminal.

-- Entra a tu proyecto:
cd C:\laragon\www\aula-3d

-- Importar la base de datos:
database/

-- Para instalar dependencias y compilar:

npm install
npm run build


-- Para iniciar el servidor multijugador, abre una segunda terminal de Laragon:

cd C:\laragon\www\aula-3d
npm run multiplayer


-- Deja abierta esa segunda terminal mientras se utilice el campus virtual.

-- Acceso:
http://localhost:8081/aula-3d/login.php
