export const ICON = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  briefcase: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  mail: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
  spark: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z',
  terminal: 'M5 7l5 5-5 5M12 17h7',
  torch: 'M9 2h6l-1 7h-4zM10 9h4v11h-4z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  replay: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
} as const;

export const SECTIONS = [
  { id: 'overview', label: 'Overview', no: '01', d: ICON.grid },
  { id: 'work', label: 'Work', no: '02', d: ICON.folder },
  { id: 'experience', label: 'Experience', no: '03', d: ICON.briefcase },
  { id: 'stack', label: 'Stack', no: '04', d: ICON.layers },
  { id: 'contact', label: 'Contact', no: '05', d: ICON.mail },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
