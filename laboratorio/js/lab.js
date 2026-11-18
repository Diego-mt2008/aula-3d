const dialog = document.querySelector('#lab-dialog');
const picker = document.querySelector('#station-picker');
const stationList = document.querySelector('#station-list');
const config = document.querySelector('#lab-config');
const ping = document.querySelector('#lab-ping');
const destination = ping.elements.target;
const message = document.querySelector('#lab-message');
const output = document.querySelector('#lab-output');
const progress = document.querySelector('#lab-progress');
const stationIds = Array.from({ length: 24 }, (_, index) => index + 1);
const pc = id => `PC ${String(id).padStart(2, '0')}`;
let stations = {};
let activeId;
let busy = false;
let openedRecord = null;
let loaded = false;
let revision = 0;
let refreshing = false;

export function latestStations() {
  return stations;
}

const sidebar = document.querySelector('#controls');
const panelButton = document.querySelector('#show-stations');
function togglePanel() {
  const hidden = sidebar.classList.toggle('collapsed');
  panelButton.setAttribute('aria-expanded', String(!hidden));
  (hidden ? panelButton : stationList).focus();
}
panelButton.addEventListener('click', togglePanel);
document.querySelector('#collapse-panel').addEventListener('click', togglePanel);


async function request(data) {
  const options = data ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  } : {};
  const response = await fetch('./puestos.php', { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('Abre el laboratorio mediante Apache en Laragon.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function renderStations() {
  const selection = stationList.value;
  stationList.replaceChildren(...stationIds.map(id => new Option(
    `${pc(id)} · ${stations[id]?.name ?? 'Disponible'}`, id,
  )));
  if (selection) stationList.value = selection;
  const target = destination.value;
  destination.replaceChildren(...stationIds.filter(id => id !== activeId).map(id => {
    const station = stations[id];
    return new Option(`${pc(id)} · ${station ? `${station.name} (${station.ip})` : 'Sin configurar'}`, id);
  }));
  if ([...destination.options].some(option => option.value === target)) destination.value = target;
  progress.textContent = `${Object.keys(stations).length} de ${stationIds.length} PC configuradas`;
  window.dispatchEvent(new Event('lab-roster'));
}

function setBusy(value) {
  busy = value;
  for (const field of config.elements) field.disabled = value || !loaded;
  ping.querySelector('button').disabled = value || !loaded || !stations[activeId];
  document.querySelector('#lab-close').disabled = value;
}

async function openStation(id) {
  if (!stationIds.includes(id) || busy || dialog.open) return;
  activeId = id;
  revision++;
  loaded = false;
  openedRecord = null;
  stationList.value = id;
  document.querySelector('#lab-title').textContent = pc(id);
  config.reset();
  output.textContent = '';
  config.elements.ip.placeholder = `192.168.50.${id + 10}`;
  config.elements.mac.placeholder = `02:00:00:00:00:${String(id + 10).padStart(2, '0')}`;
  dialog.showModal();
  setBusy(true);
  try {
    message.textContent = 'Cargando configuración…';
    ({ stations } = await request());
    renderStations();
    const station = stations[id];
    openedRecord = station ?? null;
    loaded = true;
    if (station) {
      for (const field of ['name', 'ip', 'mac']) config.elements[field].value = station[field];
    }
    message.textContent = 'Práctica virtual · Máscara /24';
  } catch (error) {
    message.textContent = error.message;
    renderStations();
  } finally {
    setBusy(false);
  }
}

picker.addEventListener('submit', event => {
  event.preventDefault();
  openStation(Number(stationList.value));
});
window.addEventListener('lab-station', event => openStation(event.detail));
document.querySelector('#lab-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });

config.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !loaded) return;
  const fields = Object.fromEntries(new FormData(config));
  revision++;
  setBusy(true);
  try {
    ({ stations } = await request({ action: 'save', id: activeId, previous: openedRecord, ...fields }));
    openedRecord = stations[activeId];
    for (const field of ['name', 'ip', 'mac']) config.elements[field].value = openedRecord[field];
    output.textContent = '';
    renderStations();
    message.textContent = 'Configuración guardada. Selecciona una PC de destino.';
  } catch (error) {
    message.textContent = error.message;
  } finally {
    setBusy(false);
  }
});

ping.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const target = Number(destination.value);
  revision++;
  setBusy(true);
  output.textContent = 'Enviando 4 paquetes virtuales…';
  try {
    const result = await request({ action: 'ping', id: activeId, target });
    const lines = [`Ping simulado · ${result.source} → ${result.destination ?? pc(target)}`];
    if (result.received) {
      for (let packet = 1; packet <= 4; packet++) {
        lines.push(`Respuesta de ${result.destination} · paquete ${packet}/4`);
      }
      lines.push(`Destino: ${result.name}`, 'Reto completado.');
    } else if (result.destination) {
      lines.push('Destino inaccesible. Las PC están en subredes distintas y el aula no tiene enrutador.');
    } else {
      lines.push('Tiempo de espera agotado. El destino todavía no está configurado.');
    }
    lines.push(`Enviados: 4 · Recibidos: ${result.received} · Perdidos: ${4 - result.received}`);
    output.textContent = lines.join('\n');
    stations = result.stations;
    renderStations();
  } catch (error) {
    output.textContent = error.message;
  } finally {
    setBusy(false);
  }
});

async function refreshRoster() {
  if (busy || refreshing || document.hidden) return;
  const startedAt = revision;
  refreshing = true;
  try {
    const result = await request();
    if (startedAt !== revision) return;
    if (JSON.stringify(stations) !== JSON.stringify(result.stations)) {
      stations = result.stations;
      renderStations();
    }
    progress.textContent = `${Object.keys(stations).length} de ${stationIds.length} PC configuradas`;
  } catch (error) {
    if (startedAt === revision) progress.textContent = 'Sin conexión con el aula. Comprueba que Apache esté iniciado.';
  } finally {
    refreshing = false;
  }
}

renderStations();
refreshRoster();
window.setInterval(refreshRoster, 5000);
document.addEventListener('visibilitychange', refreshRoster);
