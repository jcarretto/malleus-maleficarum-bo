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
} as const
