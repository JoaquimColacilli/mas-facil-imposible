export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-03-31',
    changes: [
      'Sistema completo de Novedades (Changelog en pop-up)',
      'Arreglados tipados de KeyboardEvent en el cliente de transacciones',
      'Corrección de guardado de ingresos sin categoría'
    ]
  },
  {
    version: '1.0.1',
    date: '2026-03-31',
    changes: [
      'Agregado sistema de Novedades (Changelog)',
      'Corregido error de navegación (teclas de flechas) al visualizar transacciones',
      'Corregido guardado de transacciones de ingreso (sin categoría)'
    ]
  }
];
