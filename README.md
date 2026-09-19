# Mini Mercado Goya — POS

Sistema de punto de venta de escritorio, offline-first, para el mini mercado
en Goya, Corrientes. Este documento explica cómo instalar todo lo necesario
en una PC con Windows y compilar el ejecutable final.

Si buscás cómo **usar** el sistema día a día (vender, cobrar, cerrar caja),
ese es otro documento: **`MANUAL_USUARIO.pdf`**. Este README es para
**instalar y compilar**, no para operar la caja.

Si te interesa el detalle técnico de cómo se construyó cada fase del
proyecto, eso está en `DESARROLLO_FASES.md`.

---

## 1. Qué necesitás antes de empezar

Una PC con **Windows 10 o Windows 11** (64 bits), con al menos 8 GB de RAM
y unos 5 GB libres en disco (entre las herramientas de compilación y el
proyecto).

Vas a instalar, en este orden:

1. **Node.js** (v18 o v20 LTS)
2. **Rust** (vía `rustup`)
3. **Microsoft C++ Build Tools** (necesario para que Rust compile en Windows)
4. **WebView2 Runtime** (Tauri lo usa para renderizar la interfaz)
5. Opcionalmente, **Git** (para clonar en vez de descargar el ZIP)

Andá tranquilo: son instalaciones estándar de Windows, "Siguiente, Siguiente,
Finalizar" en la mayoría de los pasos. Te marco dónde hay que prestar
atención.

---

## 2. Instalar Node.js

1. Entrá a **https://nodejs.org/** y descargá la versión **LTS** (la que
   dice "Recommended for most users"), en su instalador para Windows (.msi).
2. Ejecutá el instalador. Dejá todas las opciones por defecto marcadas
   (incluida "Add to PATH", que ya viene tildada).
3. Terminada la instalación, abrí una **nueva** ventana de PowerShell o CMD
   (importante: si ya tenías una abierta, cerrala y abrí otra para que
   tome el PATH actualizado) y verificá:

   ```powershell
   node --version
   npm --version
   ```

   Deberías ver algo como `v20.x.x` y `10.x.x`. Si ves un error de
   "comando no reconocido", reiniciá la PC y probá de nuevo.

---

## 3. Instalar Rust

1. Entrá a **https://rustup.rs/** y descargá `rustup-init.exe`.
2. Ejecutalo. Te va a preguntar el tipo de instalación — elegí la opción
   **1) Proceed with installation (default)**.
3. Si en algún momento te avisa que **no encuentra Visual Studio C++ Build
   Tools**, no te asustes: lo instalamos en el paso 4. Rustup te va a dejar
   igual instalar Rust; el link a los Build Tools te lo va a mostrar en
   pantalla.
4. Cuando termine, cerrá y volvé a abrir la terminal, y verificá:

   ```powershell
   rustc --version
   cargo --version
   ```

   Deberías ver algo como `rustc 1.8x.x` y `cargo 1.8x.x`.

---

## 4. Instalar Microsoft C++ Build Tools

Rust en Windows necesita el linker y las herramientas de compilación de
Visual Studio (no hace falta instalar Visual Studio completo, solo las
"Build Tools").

1. Entrá a **https://visualstudio.microsoft.com/visual-cpp-build-tools/**
2. Descargá el instalador (**Build Tools for Visual Studio**).
3. Al abrirlo, te va a mostrar una lista de "cargas de trabajo"
   (workloads). Tildá:
   - ✅ **Desarrollo para el escritorio con C++** (Desktop development with C++)
4. Dale a **Instalar**. Esto puede tardar 15-30 minutos y ocupa varios GB —
   es normal, es el compilador de C++ completo de Microsoft.
5. Terminada la instalación, **reiniciá la PC** (Windows a veces lo pide,
   y conviene hacerlo igual para que el PATH se actualice bien).

### Cómo confirmar que quedó bien
Abrí una terminal nueva y corré:

```powershell
cargo --version
```

Si Rust y las Build Tools están bien instalados, no debería haber ningún
error al compilar más adelante relacionado con `link.exe` o `msvc`.

---

## 5. Instalar WebView2 Runtime

Windows 11 ya lo trae instalado. En Windows 10 puede que no.

1. Entrá a **https://developer.microsoft.com/microsoft-edge/webview2/**
2. Descargá el **"Evergreen Bootstrapper"** (la opción recomendada).
3. Ejecutalo. Es una instalación rápida, sin opciones que elegir.

Si no estás seguro si ya lo tenés instalado: no pasa nada por instalarlo
de nuevo, el instalador detecta si ya está y no rompe nada.

---

## 6. Descomprimir el proyecto

1. Descargá y descomprimí `Mini-mercado-Goya-FINAL-FINAL.zip` en una
   carpeta simple, por ejemplo `C:\MiniMercadoGoya\`.
   - **Evitá** rutas con espacios o tildes si podés (ej. mejor
     `C:\MiniMercadoGoya` que `C:\Users\Juan Pérez\Mis Documentos\...`).
2. Abrí una terminal (PowerShell) y navegá a la carpeta del proyecto:

   ```powershell
   cd C:\MiniMercadoGoya\mini-mercado-goya
   ```

---

## 7. Configurar las variables de Supabase (licencia)

El sistema de licencia remota (Fase 13) necesita la URL de tu proyecto de
Supabase y la clave pública (**anon key** — nunca la `service_role`, esa
NUNCA va acá). Si todavía no tenés el proyecto de Supabase armado, podés
saltear este paso por ahora y compilar igual: el sistema va a compilar y
funcionar, pero la pantalla de Licencia va a mostrar "no configurado"
hasta que estas variables estén.

Creá el archivo `src-tauri/.cargo/config.toml` con este contenido
(reemplazando los valores por los tuyos):

```toml
[env]
SUPABASE_URL = "https://TU-PROYECTO.supabase.co"
SUPABASE_ANON_KEY = "tu-anon-key-publica-aca"
```

> Esta ruta (`src-tauri/.cargo/config.toml`) ya está en el `.gitignore`
> si en algún momento subís este proyecto a un repositorio — no la borres
> del `.gitignore`, para no publicar por accidente tus credenciales.

---

## 8. Instalar las dependencias del proyecto

Desde la carpeta `mini-mercado-goya` (la raíz, donde está `package.json`):

```powershell
npm install
```

Esto va a tardar unos minutos la primera vez. Al terminar, no debería
haber errores en rojo (warnings en amarillo son normales).

---

## 9. Primera compilación de prueba (recomendado antes de armar el instalador)

Antes de generar el `.exe` final, conviene verificar que todo compila:

```powershell
cd src-tauri
cargo check
cd ..
```

`cargo check` compila el código Rust sin generar el binario final — es
más rápido y sirve para encontrar errores. **Este es el paso que más
probablemente tenga algún ajuste para hacer**, ya que el código Rust de
este proyecto se escribió sin poder compilarlo en el entorno donde se
generó. Si `cargo check` tira errores, copiá el mensaje completo y lo
resolvemos juntos.

Si `cargo check` termina sin errores (puede mostrar warnings, eso está
bien), probá levantar la app completa en modo desarrollo:

```powershell
npm run tauri dev
```

Esto abre la aplicación en una ventana, con recarga en caliente. Cerrala
con Ctrl+C en la terminal cuando termines de probar.

---

## 10. Compilar el instalador final de Windows

Cuando `cargo check` y `npm run tauri dev` funcionen sin problemas:

```powershell
npm run tauri build
```

Esto puede tardar varios minutos (está compilando Rust en modo release,
optimizado). Al terminar, el instalador va a quedar en:

```
src-tauri\target\release\bundle\nsis\MiniMercadoGoya_0.1.0_x64-setup.exe
```

Ese es el archivo que instalás en la PC de la caja. Al ejecutarlo, crea:
- `MiniMercadoGoya.exe`
- La carpeta de datos de la app (`mercado.db`, `config.json`, `logs/`,
  `backups/`) se crea sola la primera vez que abrís el programa, en
  `%APPDATA%\com.minimercadogoya.pos\`.

---

## 11. Errores comunes y cómo resolverlos

**`'node' no se reconoce como un comando interno o externo`**
→ Node no quedó en el PATH. Reiniciá la PC. Si persiste, reinstalá Node.js
marcando la opción de agregar al PATH.

**`error: linker 'link.exe' not found`** (al correr `cargo check`)
→ Faltan las C++ Build Tools del paso 4, o no reiniciaste después de
instalarlas. Volvé a ese paso.

**`error: Microsoft Visual C++ 14.0 or greater is required`**
→ Mismo caso que el anterior.

**La ventana de la app queda en blanco al abrir**
→ Probablemente falta el WebView2 Runtime (paso 5).

**`cargo check` tira errores de tipos o de crates que no compilan**
→ Este es el escenario esperado la primera vez, dado que el código no se
compiló antes de esta entrega. Pegame el error completo (todo el bloque
rojo) y lo resolvemos juntos.

**La pantalla de Licencia dice "no configurado"**
→ Revisá el paso 7 (`src-tauri/.cargo/config.toml`). Si recién lo creaste,
tenés que volver a compilar (esas variables se leen en tiempo de
compilación, no se pueden cambiar en caliente).

---

## 12. Qué NO incluye esta entrega (y por qué)

- **El `.exe` ya compilado.** No pude compilar el proyecto en el entorno
  donde lo escribí (no tenía Rust/Node instalados ahí). Vos lo compilás
  acá siguiendo esta guía.
- **Pruebas con el hardware físico** (impresora, cajón, lector, balanza).
  Eso solo se puede validar en la PC real de la caja, con los equipos
  conectados.

Cuando compiles, cualquier error que te tire `cargo check`, `npm install`
o `npm run tauri build` — pegámelo tal cual (el bloque de error completo)
y lo vemos juntos.
