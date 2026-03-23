# FactuAI - Sistema de Control de Facturación con IA

Esta aplicación 100% estática permite procesar facturas en PDF que ingresan a Google Drive, lee su contenido usando Inteligencia Artificial (Gemini) y genera una tabla interactiva para exportarse a CSV/Excel.

## 🚀 Inicio Rápido (IMPORTANTE)

Por restricciones de seguridad de la arquitectura de OAuth en Google, **no debes ejecutar esta app haciendo simplemente doble-click sobre el archivo `index.html`** (bajo el protocolo bloqueado `file://`).

Debes ejecutarla a través de un servidor web local sencillo.  
Escoge una opción:

**Option A: Live Server (VS Code)**
1. Abre esta carpeta principal en **Visual Studio Code**.
2. Instala la extensión *"Live Server"*.
3. Haz click derecho sobre el `index.html` y selecciona *"Open with Live Server"*.
4. Por defecto, abrirá `http://localhost:5500` (o `http://127.0.0.1:5500`).

**Option B: Python (Desde consola de comandos)**
1. Abre tu terminal (Símbolo de Sistema o Powershell) en esta carpeta.
2. Ejecuta el comando: `python -m http.server 8000`
3. Ve a tu navegador y entra en `http://localhost:8000`.

*Alternativamente, si subes esto a Github Pages funcionará sin problema al ser 100% frontend.*

---

## 🔑 Configuración de Claves Gratuitas (Solo la primera vez)

Tendrás que ingresar al menú "**Configuración**" la primera vez que abras el programa:

### 1. Google Client ID (Identidad Drive)
Debes registrar esta app en tu Google Cloud para acceder a tus archivos de PDF:
1. Navega a la [Consola de Google Cloud](https://console.cloud.google.com/).
2. Crea un proyecto nuevo gratuito.
3. Ve a la Biblioteca de "API y Servicios" y habilita **Google Drive API**.
4. Ve al apartado de "Credenciales".
5. Dale a crear credencial -> "*ID de cliente de OAuth*".
6. Elige tipo "*Aplicación web*".
7. En el apartado de "**Orígenes de JavaScript autorizados**", debes añadir explícitamente la raíz del servidor: `http://localhost:5500` o `http://localhost:8000` (El puerto que estés usando).  
   *(No hace falta URLs de redireccionamiento).*
8. Copia la clave Client ID generada y pégala dentro del recuadro correspondiente en el programa.

### 2. Gemini API Key (Inteligencia Artificial)
Extrae con sorprendente precisión el texto del PDF:
1. Ve al [Google AI Studio (Get API Key)](https://aistudio.google.com/app/apikey).
2. Crea una clave de producción y pégala en su recuadro dentro del programa.

### 3. Carpetas y Centros de Costo
-  La app intentará detectar y buscar automáticamente en tu disco Google Drive aquellas carpetas nombradas tal y como especificaste de forma estricta: `FACTURAS A PROCESAR` y `FACTURAS PROCESADAS`. Adicionalmente, crealas de antemano.
- No olvides poder añadir o pegar tu lista en formato de .txt con los Centros de Costo separados por salto de línea o de lo contrario el campo valdrá 'General'.

_Todos estos seteos se alojan de forma hermética y persistente localmente (Local Storage) dentro de tu navegador y jamás viajan ni se exponen a terceros fuera de la API de Google._
