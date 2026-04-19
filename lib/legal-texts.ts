// NOTE: Textos generados como boilerplate razonable para MVP personal de MFI.
// NO son legal advice. Si la app monetiza o expone a EU seriamente, contratar abogado.
// Cualquier cambio sustantivo a un texto requiere bumpear su versión correspondiente
// (TOS_VERSION o PRIVACY_VERSION) — eso fuerza re-acceptance a todos los users.

export const TOS_VERSION = '1.0'
export const TOS_DATE = '2026-04-18'

export const PRIVACY_VERSION = '1.0'
export const PRIVACY_DATE = '2026-04-18'

export const LEGAL_CONTACT_EMAIL = 'joaquimcolacilli9@gmail.com'
export const LEGAL_OPERATOR_NAME = 'Joaquim Colacilli'

export const TOS_TEXT = `# Términos y Condiciones — MFI (Más Fácil Imposible)

*Versión ${TOS_VERSION} — 18 de abril de 2026*

## 1. Qué es MFI

MFI es una app web personal para registrar y visualizar tus finanzas: ingresos, gastos, ahorros, inversiones, cobros y deudas, en pesos argentinos y dólares. Está pensada para uso individual.

## 2. Cuenta

Para usar MFI necesitás una cuenta con email y contraseña. Sos responsable de mantener tu contraseña segura. Si detectás un acceso no autorizado, cambiala desde Ajustes y avisanos.

MFI incluye funciones opcionales para conectarte con otros usuarios: podés elegir un username público, activar un perfil visible, enviar solicitudes de amistad, chatear 1:1 y vincular cobros o deudas con amigos. Estas funciones están desactivadas por default — si no las usás, tu cuenta funciona exactamente como una cuenta individual. Tus montos, transacciones y datos financieros **nunca** se exponen a otros usuarios, incluso si son tus amigos. Lo único que puede ver otro usuario de vos es lo que elegís mostrar explícitamente: username, avatar, apodo, bio, streak de ahorro y logros.

## 3. Uso aceptable

Podés usar MFI para tus finanzas personales. No podés usarla para:

- Operar cuentas que no son tuyas sin autorización.
- Cargar datos falsos a nombre de terceros.
- Intentar romper el sistema, escanear vulnerabilidades o sobrecargar la infraestructura.
- Acosar, amenazar o enviar spam a otros usuarios a través de las funciones sociales.
- Usar la app para actividades ilegales.

## 4. Sin asesoramiento financiero

MFI es una herramienta de seguimiento, no de asesoramiento. Los gráficos, totales, alertas y resúmenes que ves son cálculos sobre los datos que vos cargás. No constituyen recomendación de inversión, consejo financiero, ni opinión profesional sobre cómo manejar tu plata.

Las decisiones que tomes basándote en lo que ves en MFI son exclusivamente tuyas. Si necesitás asesoramiento real, consultá a un profesional matriculado.

## 5. Responsabilidad

Hacemos lo posible para que la app funcione bien y los datos sean precisos, pero MFI se ofrece "tal cual está". No nos hacemos responsables de:

- Pérdida de datos por fallas de tu dispositivo, navegador o conexión.
- Decisiones financieras tomadas en base a lo que muestra la app.
- Cortes de servicio puntuales por mantenimiento o problemas de la infraestructura de terceros (Supabase, Vercel).

## 6. Disponibilidad

MFI puede estar caída por mantenimiento, actualizaciones o problemas técnicos sin aviso previo. Tratamos de minimizar las interrupciones, pero no garantizamos disponibilidad 24/7.

## 7. Cambios en los términos

Podemos actualizar estos términos cuando la app cambia o cuando aparecen nuevas funcionalidades. Cuando los términos cambien, vas a recibir un aviso al ingresar a la app y vas a tener que aceptarlos para seguir usándola. Si no estás de acuerdo, podés exportar tus datos y cerrar la cuenta antes de continuar.

## 8. Terminación

Podés cerrar tu cuenta en cualquier momento desde Ajustes → "Borrar mi cuenta". Eso elimina permanentemente todos tus datos. La acción es irreversible.

Nos reservamos el derecho de suspender o cerrar cuentas que violen estos términos, especialmente lo establecido en el punto 3.

## 9. Ley aplicable

Estos términos se rigen por las leyes de la República Argentina. Cualquier conflicto se resuelve en los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.

## 10. Menores de edad

MFI está pensada para personas mayores de 18 años. Si sos menor, necesitás autorización de tu responsable legal para usar la app. Esto incluye las funciones sociales.

## 11. Contacto

Para cualquier consulta sobre estos términos, escribinos a ${LEGAL_CONTACT_EMAIL}.
`

export const PRIVACY_TEXT = `# Política de Privacidad — MFI (Más Fácil Imposible)

*Versión ${PRIVACY_VERSION} — 18 de abril de 2026*

Esta política explica qué datos guarda MFI sobre vos, para qué los usa, con quién los comparte y cómo podés ejercer tus derechos. Está alineada con la Ley 25.326 de Protección de Datos Personales de la República Argentina.

## 1. Quiénes somos

MFI (Más Fácil Imposible) es una app personal de finanzas operada por ${LEGAL_OPERATOR_NAME}. Para consultas sobre privacidad o ejercicio de derechos, escribí a ${LEGAL_CONTACT_EMAIL}.

## 2. Qué datos guardamos

- **De tu cuenta**: email, contraseña (cifrada por nuestro proveedor de autenticación), nombre completo (opcional), apodo (opcional), avatar (opcional), zona horaria y ubicación (opcional, para mostrar el clima), username (identificador público único, si lo elegís), bio (descripción pública opcional), preferencias de privacidad del perfil público (si permitís que te encuentren, qué mostrás).
- **De tu actividad financiera**: transacciones (ingresos, gastos, ahorros, inversiones) con monto, moneda, fecha, categoría, nota y método de pago; metas de ahorro; cobros y deudas; carteras de inversión; planillas de seguimiento.
- **De tu actividad social** (si usás las funciones de amigos y chat): solicitudes de amistad enviadas y recibidas, lista de amigos, lista de usuarios bloqueados, conversaciones y mensajes de texto intercambiados, estado de presencia (online / última vez conectado), confirmaciones de lectura de mensajes, cobros y deudas vinculados a un amigo. Los mensajes se guardan permanentemente hasta que los borres o cerrés la cuenta.
- **De tu uso**: fecha de creación de la cuenta, última versión de la app que viste, preferencia de modo (clásico o MFI), preferencia de moneda, estado de ánimo (opcional), notificaciones generadas para vos.
- **Técnicos básicos**: cookies de sesión necesarias para mantenerte logueado.

Algunos campos sensibles (como notas de transacciones, montos puntuales y descripciones) están cifrados con AES-256-GCM antes de guardarse. Eso significa que aunque alguien acceda a la base de datos, no puede leer esos campos sin la clave.

## 3. Para qué usamos tus datos

- Para que puedas usar la app: mostrar tu información, calcular totales, generar gráficos, enviar notificaciones in-app.
- Para mantener tu cuenta activa: autenticación, recuperación de contraseña, sesión.
- Para hacer funcionar las funciones sociales si las activás: mostrar tu perfil público a otros usuarios, entregar mensajes a tu destinatario, sincronizar cobros y deudas vinculados.
- Para mejorar la app: estadísticas anónimas de uso vía Vercel Analytics (no incluyen tus datos financieros).

No usamos tus datos para publicidad, no los vendemos, no los cedemos a terceros con fines comerciales.

## 4. Con quién los compartimos

Tus datos se procesan a través de proveedores que actúan como nuestros encargados de tratamiento:

- **Supabase** (Estados Unidos): base de datos, autenticación y almacenamiento de archivos. Política: supabase.com/privacy.
- **Vercel** (Estados Unidos): hosting de la aplicación y métricas anónimas de uso. Política: vercel.com/legal/privacy-policy.
- **Open-Meteo** (Alemania): si configurás tu ubicación para ver el clima en la app, enviamos las coordenadas a este servicio gratuito para obtener el pronóstico. No enviamos datos identificables. Política: open-meteo.com/en/terms.
- **BigDataCloud** (Australia): si usás "Usar mi ubicación actual" en Ajustes, enviamos las coordenadas a este servicio para traducirlas al nombre de tu ciudad. No enviamos datos identificables. Política: bigdatacloud.com/privacy-and-cookie-policy.

Estos proveedores tienen acceso técnico a la información para poder operar el servicio, pero no la usan para fines propios.

Además de estos proveedores, si activás las funciones sociales, otros usuarios de MFI pueden ver parte de tu información: tu username, avatar, apodo, bio (si la tenés activa), streak de ahorro y logros (si los tenés activos). Esta visibilidad es opcional y la controlás desde Ajustes → Perfil social. Los usuarios con los que chateás acceden al contenido de tus mensajes — tratá tus conversaciones como tratarías un chat de WhatsApp: no compartas cosas que no quieras que la otra persona pueda leer, guardar o mostrar.

Al usar MFI estás autorizando la transferencia internacional de tus datos a los proveedores listados arriba, necesaria para que la app funcione.

## 5. Tus derechos

Conforme a la Ley 25.326, tenés derecho a:

- **Acceso**: ver toda la información que tenemos sobre vos.
- **Rectificación**: corregir datos incorrectos o desactualizados.
- **Supresión**: eliminar tus datos de nuestros sistemas.
- **Información**: saber para qué usamos tus datos y con quién los compartimos (eso es esta política).

## 6. Cómo ejercerlos

Desde la propia app:

- **Acceso**: Ajustes → "Exportar mis datos". Te bajás un archivo JSON con toda la información que tenemos sobre vos.
- **Rectificación**: editás directamente desde Ajustes y desde cada sección (transacciones, metas, cobros, etc.).
- **Supresión**: Ajustes → "Borrar mi cuenta". Acción irreversible: borra permanentemente tu cuenta y todos los datos asociados, sin período de gracia.

Si necesitás algo que no podés hacer desde la app, escribinos a ${LEGAL_CONTACT_EMAIL}.

## 7. Conservación

Conservamos tus datos mientras tengas la cuenta activa. Cuando borrás tu cuenta, los datos se eliminan inmediatamente y de forma irreversible de nuestra base.

Nuestro proveedor de base de datos mantiene backups diarios retenidos hasta por 1 día. Después de ese plazo, los datos borrados no son recuperables.

## 8. Seguridad

- Comunicación cifrada entre tu navegador y nuestros servidores (HTTPS).
- Contraseñas guardadas con hash unidireccional (no podemos verlas en texto plano).
- Datos sensibles cifrados en la base con AES-256-GCM.
- Acceso a la base restringido por Row Level Security: cada usuario solo puede leer sus propios datos.

Ningún sistema es 100% seguro. Si detectamos una brecha que afecte tus datos, te avisamos por email dentro de las 72 horas.

## 9. Menores de edad

MFI está pensada para mayores de 18 años. Si tenés menos, necesitás autorización de tu responsable legal para usar la app.

## 10. Cambios en esta política

Si actualizamos cómo manejamos tus datos, vas a recibir un aviso al ingresar a la app y vas a tener que aceptar la nueva versión para seguir usándola. La fecha y versión de esta política están al inicio del documento.

## 11. Autoridad de control

Tenés derecho a presentar denuncias ante la Agencia de Acceso a la Información Pública (AAIP), órgano de control de la Ley 25.326 en Argentina. Más información en argentina.gob.ar/aaip.
`

export interface ProfileLegalState {
  tos_version: string | null
  privacy_version: string | null
}

/**
 * True if the user must (re-)accept the current versions of ToS and/or Privacy
 * before being allowed to use the app. Triggers on first signup (NULL versions)
 * AND on version bumps. Used by the AppLayout to decide whether to render
 * the blocking modal.
 */
export function needsLegalReacceptance(profile: ProfileLegalState | null): boolean {
  if (!profile) return false // unauthenticated paths handle their own redirects
  return profile.tos_version !== TOS_VERSION || profile.privacy_version !== PRIVACY_VERSION
}
