<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function stationId($value): bool
{
    return is_int($value) && $value >= 1 && $value <= 24;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    reply(['error' => 'Método no permitido.'], 405);
}

$input = [];
if ($method === 'POST') {
    if (!preg_match('~^application/json(?:;|$)~i', $_SERVER['CONTENT_TYPE'] ?? '')) {
        reply(['error' => 'Se requiere una solicitud JSON.'], 415);
    }
    $input = json_decode(file_get_contents('php://input', false, null, 0, 4096), true);
    if (!is_array($input) || !stationId($input['id'] ?? null)) {
        reply(['error' => 'Selecciona una PC válida.'], 400);
    }
}

$path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'aula-redes-' . hash('sha256', dirname(__DIR__) . DIRECTORY_SEPARATOR . 'api');
$lock = fopen($path . '.lock', 'c');
if (!$lock || !flock($lock, $method === 'POST' ? LOCK_EX : LOCK_SH)) {
    reply(['error' => 'No se pudo abrir el registro del aula.'], 500);
}
$stations = [];
if (is_file($path . '.json')) {
    $stations = json_decode((string) file_get_contents($path . '.json'), true);
    if (!is_array($stations)) {
        reply(['error' => 'No se pudo leer el registro del aula.'], 500);
    }
}
if ($method === 'GET') {
    reply(['stations' => (object) $stations]);
}

$id = $input['id'];
switch ($input['action'] ?? '') {
    case 'save':
        $name = is_string($input['name'] ?? null) ? trim($input['name']) : '';
        $ip = is_string($input['ip'] ?? null) ? trim($input['ip']) : '';
        $mac = is_string($input['mac'] ?? null) ? strtoupper(str_replace('-', ':', trim($input['mac']))) : '';
        if (!preg_match('/^[^\p{C}]{1,60}$/uD', $name)) {
            reply(['error' => 'Escribe un nombre o alias de hasta 60 caracteres.'], 422);
        }
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
            || in_array(substr(strrchr($ip, '.'), 1), ['0', '255'], true)) {
            reply(['error' => 'Usa una IPv4 válida de host con máscara /24, por ejemplo 192.168.50.11.'], 422);
        }
        if (!preg_match('/^(?:[\dA-F]{2}:){5}[\dA-F]{2}$/D', $mac)
            || (hexdec(substr($mac, 0, 2)) & 1) || $mac === '00:00:00:00:00:00') {
            reply(['error' => 'Usa una MAC unicast, por ejemplo 02:00:00:00:00:11.'], 422);
        }
        foreach ($stations as $number => $station) {
            if ((int) $number === $id) {
                continue;
            }
            if ($station['ip'] === $ip || $station['mac'] === $mac) {
                reply(['error' => 'Esa IP o MAC ya está asignada a la PC ' . $number . '.'], 409);
            }
        }
        $record = ['name' => $name, 'ip' => $ip, 'mac' => $mac];
        $previous = $stations[$id] ?? null;
        if ($record !== $previous && ($input['previous'] ?? null) !== $previous) {
            reply(['error' => 'Otro alumno cambió este puesto. Vuelve a abrirlo para ver su configuración.'], 409);
        }
        $stations[$id] = $record;
        $encoded = json_encode($stations, JSON_UNESCAPED_UNICODE);
        $pending = $path . '.pending';
        if (file_put_contents($pending, $encoded) !== strlen($encoded) || !rename($pending, $path . '.json')) {
            reply(['error' => 'No se pudo guardar la configuración.'], 500);
        }
        reply(['stations' => (object) $stations]);

    case 'ping':
        $target = $input['target'] ?? null;
        if (!stationId($target) || $target === $id) {
            reply(['error' => 'Selecciona otra PC del aula.'], 422);
        }
        if (!isset($stations[$id])) {
            reply(['error' => 'Primero guarda la configuración de la PC de origen.'], 422);
        }
        $destination = $stations[$target] ?? null;
        $sourceIp = $stations[$id]['ip'];
        $sameSubnet = $destination !== null
            && substr($sourceIp, 0, strrpos($sourceIp, '.')) === substr($destination['ip'], 0, strrpos($destination['ip'], '.'));
        reply([
            'source' => $sourceIp,
            'destination' => $destination['ip'] ?? null,
            'name' => $destination['name'] ?? null,
            'received' => $sameSubnet ? 4 : 0,
            'stations' => (object) $stations,
        ]);

    default:
        reply(['error' => 'Acción desconocida.'], 400);
}
