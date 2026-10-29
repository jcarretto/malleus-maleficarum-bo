/**
 * Every user-facing string of the back office (Spanish only).
 * Keeping them here makes wording reviews and a future translation mechanical.
 */
export const copy = {
  appName: 'Malleus Maleficarum',
  appSection: 'Backoffice',
  nav: {
    label: 'Navegación principal',
    home: 'Inicio',
    accessList: 'Acceso a la app',
  },
  home: {
    title: 'Inicio',
    description:
      'Las secciones de usuarios, códigos de activación y partidas llegan en las próximas tareas.',
  },
  errors: {
    unexpectedTitle: 'Algo salió mal',
    unexpectedBody: 'Ocurrió un error inesperado. Probá de nuevo.',
    notFoundTitle: 'Página no encontrada',
  },
  actions: {
    retry: 'Reintentar',
    backHome: 'Volver al inicio',
  },
  /** Messages for the error codes returned by the API, plus client-side `network_error`. */
  apiErrors: {
    network_error: 'No hay conexión con el servidor. Revisá tu conexión e intentá de nuevo.',
    internal_error: 'Algo falló en el servidor. Intentá de nuevo en unos minutos.',
    not_found: 'No encontramos lo que buscabas.',
    method_not_allowed: 'La solicitud no es válida.',
    invalid_json: 'La solicitud no es válida.',
    unsupported_media_type: 'La solicitud no es válida.',
    payload_too_large: 'La solicitud es demasiado grande.',
    validation_failed: 'Revisá los datos marcados.',
    rate_limited: 'Demasiados intentos. Esperá un momento y probá de nuevo.',
    unauthorized: 'Tu sesión venció. Ingresá de nuevo.',
    forbidden: 'No tenés permiso para hacer esto.',
    email_taken: 'Ya existe una cuenta con ese email.',
    invalid_credentials: 'Email, contraseña o código incorrectos.',
    invalid_refresh_token: 'Tu sesión venció. Ingresá de nuevo.',
    invalid_google_token: 'No pudimos verificar tu cuenta de Google. Probá de nuevo.',
    google_account_conflict: 'Esta cuenta ya está vinculada a otra cuenta de Google.',
    google_signin_unavailable: 'El ingreso con Google no está disponible por ahora.',
    invalid_reset_token: 'El enlace venció o ya se usó. Pedí uno nuevo.',
    not_ready: 'El servicio no está disponible por ahora. Intentá más tarde.',
    already_listed: 'Ese email ya está en la lista.',
    access_list_not_configured: 'La lista de acceso no está configurada en el servidor.',
    upstream_error: 'Un servicio externo no respondió. Intentá de nuevo en unos minutos.',
  },
  rateLimit: {
    /** Throttled by the API, which says how many seconds to wait. */
    retryIn: (seconds: number) => {
      if (seconds <= 1) return 'Demasiados intentos. Probá de nuevo en un segundo.'
      if (seconds < 60) return `Demasiados intentos. Probá de nuevo en ${String(seconds)} segundos.`
      const minutes = Math.ceil(seconds / 60)
      return minutes === 1
        ? 'Demasiados intentos. Probá de nuevo en un minuto.'
        : `Demasiados intentos. Probá de nuevo en ${String(minutes)} minutos.`
    },
  },
  auth: {
    signInTitle: 'Ingresar al backoffice',
    signInDescription: 'Usá tu cuenta de administrador y el código de tu app de autenticación.',
    email: 'Email',
    password: 'Contraseña',
    totpCode: 'Código de verificación',
    totpHint: '6 dígitos de tu app de autenticación.',
    submit: 'Ingresar',
    submitting: 'Ingresando…',
    restoring: 'Verificando sesión…',
    errors: {
      emailRequired: 'Ingresá tu email.',
      passwordRequired: 'Ingresá tu contraseña.',
      totpInvalid: 'Ingresá el código de 6 dígitos.',
    },
  },
  accessList: {
    title: 'Acceso a la app',
    description: 'Durante el prelanzamiento, solo estos emails pueden abrir la app.',
    loading: 'Cargando la lista…',
    empty: 'Todavía no hay emails en la lista.',
    tableCaption: 'Emails con acceso a la app',
    columnEmail: 'Email',
    columnAddedAt: 'Agregado',
    columnActions: 'Acciones',
    addTitle: 'Agregar un email',
    email: 'Email',
    emailPlaceholder: 'nombre@ejemplo.com',
    add: 'Agregar',
    adding: 'Agregando…',
    added: (email: string) => `Se agregó ${email}.`,
    remove: 'Quitar',
    removeLabel: (email: string) => `Quitar ${email}`,
    removing: 'Quitando…',
    removed: (email: string) => `Se quitó ${email}.`,
    alreadyRemoved: (email: string) => `${email} ya no estaba en la lista.`,
    confirmTitle: (email: string) => `¿Quitar ${email}?`,
    confirmBody: 'No va a poder abrir la app hasta que lo agregues de nuevo.',
    cancel: 'Cancelar',
    loadErrorTitle: 'No pudimos cargar la lista',
    notConfiguredTitle: 'La lista de acceso no está configurada',
    notConfiguredBody:
      'El servidor no tiene los datos de Cloudflare para administrar la lista. Pedile a quien administra el servidor que los configure.',
    errors: {
      emailRequired: 'Ingresá un email.',
      emailInvalid: 'Ingresá un email válido.',
    },
  },
  /** Messages for the per-field validation rules reported by the API. */
  validation: {
    required: 'Este campo es obligatorio.',
    email: 'Ingresá un email válido.',
    min: (min: string) => `Debe tener al menos ${min} caracteres.`,
    max: (max: string) => `Debe tener como máximo ${max} caracteres.`,
    maxbytes: 'Es demasiado largo.',
    oneof: 'Elegí una opción válida.',
    invalid: 'Valor inválido.',
  },
} as const
