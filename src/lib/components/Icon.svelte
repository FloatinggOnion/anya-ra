<script lang="ts">
  const paths = {
    canvas: 'M4 4h6v6H4z M14 14h6v6h-6z M14 4h6v6h-6z M4 14h6v6H4z',
    library: 'M4 4v16 M8 4v16 M12 4v16 M16 5l4 14',
    think: 'M9 18h6 M10 21h4 M8 14a6 6 0 1 1 8 0c-1 .8-1 2-1 2H9s0-1.2-1-2Z',
    chat: 'M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z M8 8h8 M8 12h5',
    switch: 'M4 7h16l-4-4 M20 17H4l4 4',
    sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
    moon: 'M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z',
    monitor: 'M3 4h18v12H3z M8 21h8 M12 16v5',
    search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z M14.5 14.5 21 21',
    settings: 'M20.00 12.00 L21.81 13.95 L21.24 15.83 L18.65 16.44 L17.66 17.66 L17.56 20.31 L15.83 21.24 L13.56 19.85 L12.00 20.00 L10.05 21.81 L8.17 21.24 L7.56 18.65 L6.34 17.66 L3.69 17.56 L2.76 15.83 L4.15 13.56 L4.00 12.00 L2.19 10.05 L2.76 8.17 L5.35 7.56 L6.34 6.34 L6.44 3.69 L8.17 2.76 L10.44 4.15 L12.00 4.00 L13.95 2.19 L15.83 2.76 L16.44 5.35 L17.66 6.34 L20.31 6.44 L21.24 8.17 L19.85 10.44Z M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z',
    paper: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5',
    book: 'M12 5v15 M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Z',
    note: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
    download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
    graph: 'M7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z M21 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z M14 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z M7 5l10 1 M6 7l5 10 M18 8l-5 9',
    trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    edit: 'M14 5l5 5 M4 20l5-1L21 7l-5-5L4 14z',
    plus: 'M12 4v16 M4 12h16',
    check: 'M4 12l5 5L20 6',
    alert: 'M12 3 2 21h20Z M12 9v5 M12 17v.1',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5z M12 14v3',
    cloud: 'M7 18a5 5 0 0 1-1-10 6 6 0 0 1 11-1 5.5 5.5 0 1 1 1 11Z',
    cpu: 'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',
    folder: 'M3 6V4h6l2 3h10v13H3Z',
    keyboard: 'M2 5h20v14H2z M6 9h.1 M10 9h.1 M14 9h.1 M18 9h.1 M6 13h.1 M10 13h.1 M14 13h.1 M18 13h.1 M7 16h10',
    clipboard: 'M9 4H5v17h14V4h-4 M9 2h6v5H9z M8 11h8 M8 15h6',
    pin: 'M9 3h6l-1 6 4 4v2H6v-2l4-4Z M12 15v7',
    highlight: 'm14 3 7 7-9 9-7-7Z M5 12l-3 7 3 3 7-3 M15 6l3 3',
    underline: 'M6 3v8a6 6 0 0 0 12 0V3 M4 21h16',
    'chevron-left': 'M15 5l-7 7 7 7',
    'chevron-right': 'M9 5l7 7-7 7',
    'chevron-down': 'M5 9l7 7 7-7',
    list: 'M9 6h12 M9 12h12 M9 18h12 M3 6h.1 M3 12h.1 M3 18h.1',
    'arrow-up-right': 'M5 19 19 5 M5 5h14v14',
    close: 'M5 5l14 14 M5 19 19 5',
    send: 'm3 3 18 9-18 9 4-9Z M7 12h14',
    loader: 'M20 12a8 8 0 1 1-8-8',
    experiment: 'M9 3h6 M10 3v6l-6 10a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2L14 9V3 M8 14h8',
  }
  type IconName = keyof typeof paths
  let { name, size = 18 }: { name: IconName; size?: number } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path d={paths[name]} />
</svg>

<style>
  svg { display: inline-block; flex-shrink: 0; vertical-align: -0.18em; }
</style>
