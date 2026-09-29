# Guía de Despliegue Gratuito de Pokebot

Esta guía explica paso a paso cómo desplegar Pokebot en la nube de forma **100% gratuita**, permanente y sin necesidad de ingresar tarjetas de crédito.

---

## Arquitectura del Despliegue

```mermaid
flowchart LR
    A["Neon.tech<br/>(PostgreSQL Gratuito)"] -->|DATABASE_URL| B["Render.com<br/>(Servicio Web Node.js)"]
    C["Telegram API"] <-->|HTTPS Webhook| B
    D["UptimeRobot<br/>(Keep-Alive cada 10 min)"] -->|GET /health| B
```

- **Base de datos (Neon.tech)**: Servidor PostgreSQL serverless gratuito (0.5 GB de almacenamiento, no expira).
- **Servidor Web (Render.com)**: Aloja la aplicación Node.js/Express en su plan gratuito con HTTPS y certificado SSL automático.
- **Keep-Alive (UptimeRobot)**: Envía una petición `GET /health` cada 10 minutos para evitar que el plan gratuito de Render entre en reposo.

---

## Requisitos Previos

1. Cuenta en **GitHub** con el código del bot subido a un repositorio (público o privado).
2. Token del bot de Telegram obtenido de [@BotFather](https://t.me/botfather).

---

## Paso 1: Crear la Base de Datos en Neon.tech

Render ofrece una base de datos PostgreSQL gratuita, pero **se elimina automáticamente a los 30 días**. Por ello, utilizamos **Neon**, que es permanente y compatible con Prisma:

1. Ingresa a [neon.tech](https://neon.tech) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **Create Project**.
3. Asigna un nombre (por ejemplo: `pokebot-db`), selecciona la región más cercana y la versión de Postgres por defecto.
4. En el panel principal de Neon (Dashboard), copia la cadena de conexión (**Connection String**):
   ```text
   postgresql://neondb_owner:PASSWORD@ep-xyz.region.neon.tech/neondb?sslmode=require
   ```
   > 💡 Guarda esta URL, la utilizarás como `DATABASE_URL` en Render.

---

## Paso 2: Crear el Servicio Web en Render.com

1. Ingresa a [render.com](https://render.com) e inicia sesión con tu cuenta de GitHub.
2. En el panel principal, haz clic en **New +** y selecciona **Web Service**.
3. Selecciona tu repositorio de GitHub donde está alojado `pokebot`.
4. Completa la configuración básica:
   - **Name**: `pokebot` (o el nombre que prefieras).
   - **Region**: Selecciona la misma región o la más cercana a tu base de datos de Neon.
   - **Branch**: `main`.
   - **Runtime**: `Node`.
   - **Build Command**:
     ```bash
     pnpm install --frozen-lockfile && pnpm run prisma:generate && pnpm run prisma:deploy
     ```
   - **Start Command**:
     ```bash
     pnpm start
     ```
   - **Instance Type**: Selecciona **Free** ($0/month).

---

## Paso 3: Configurar las Variables de Entorno

En la misma página de configuración de Render (o en la pestaña **Environment** del servicio):

| Nombre de la Variable | Valor                                                               | Explicación                                                                                                        |
| :-------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| `API_KEY`             | `123456789:ABCdef...`                                               | Tu token de bot generado por @BotFather                                                                            |
| `DATABASE_URL`        | `postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require` | La URL de conexión copiada de Neon en el Paso 1                                                                    |
| `WEBHOOK_URL`         | `https://tu-servicio.onrender.com`                                  | La URL pública HTTPS que Render asigna a tu servicio en la cabecera                                                |
| `WEBHOOK_SECRET`      | _(string seguro y aleatorio)_                                       | Token para validar las peticiones de Telegram. Puedes generar uno ejecutando `openssl rand -hex 32` en tu terminal |
| `NODE_ENV`            | `production`                                                        | Establece el entorno de ejecución en producción                                                                    |

> ⚠️ **Importante**: La URL en `WEBHOOK_URL` debe coincidir exactamente con el subdominio que Render le asigna a tu aplicación (incluyendo `https://` y sin barra final `/`).

Haz clic en **Deploy Web Service** (o **Create Web Service**).

---

## Paso 4: Mantener el Bot Activo 24/7 con UptimeRobot

Los servicios gratuitos de Render entran en suspensión tras 15 minutos sin recibir tráfico HTTP. Para que tu bot responda siempre de inmediato y nunca se duerma:

1. Crea una cuenta gratuita en [uptimerobot.com](https://uptimerobot.com).
2. Haz clic en **Add New Monitor**.
3. Configura el monitor:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Pokebot Keep-Alive`
   - **URL (or IP)**: `https://tu-servicio.onrender.com/health`
   - **Monitoring Interval**: Cada **10 minutos** (o 14 minutos).
4. Haz clic en **Create Monitor**.

Pokebot cuenta con el endpoint `GET /health` que responderá `{"status": "ok"}` inmediatamente, manteniendo la instancia despierta de forma permanente.

---

## Paso 5: Verificación del Despliegue

1. **Revisar los Logs en Render**:
   - En la pestaña **Logs** de Render, confirma que aparezcan las siguientes líneas:
     - `Prisma migrations applied successfully` (o `No pending migrations`).
     - `Server running on port 10000`.
     - `COMMANDS REGISTERED`.
2. **Probar en Telegram**:
   - Abre Telegram y busca tu bot.
   - Envía `/start` o `/help`.
   - Regístrate con `/register` y elige tu Pokémon inicial.
   - Prueba generar un salvaje con `/generate_pokemon` y captúralo.
   - Consulta tu colección con `/pokemons`.

---

## Solución de Problemas Comunes

- **Telegram no responde a los comandos**:
  Verifica el estado del Webhook abriendo en tu navegador:

  ```text
  https://api.telegram.org/bot<TU_API_KEY>/getWebhookInfo
  ```

  Observa el campo `last_error_message`. Si indica un error de SSL o timeout, verifica que `WEBHOOK_URL` esté bien escrito y que el servicio de Render esté activo (`Live`).

- **Error en migraciones de base de datos durante el Build**:
  Asegúrate de que `DATABASE_URL` incluya el parámetro `?sslmode=require` requerido por Neon.

- **El bot tarda en responder al primer mensaje tras mucho tiempo**:
  Significa que Render se suspendió. Asegúrate de haber configurado el monitor en UptimeRobot apuntando a `https://<tu-servicio>.onrender.com/health`.
