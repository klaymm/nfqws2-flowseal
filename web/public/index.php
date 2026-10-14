<?php
// Серверная часть веб-интерфейса nfqws2-flowseal. Всё, что меняет роутер, делает утилита nfqws2-flowseal.

const TOOL = '/opt/bin/nfqws2-flowseal';
const STATE_DIR = '/opt/etc/nfqws2-flowseal';
const WEB_CONF = STATE_DIR . '/web.conf';
const STRATEGIES_DIR = STATE_DIR . '/strategies';
const LISTS_DIR = '/opt/etc/nfqws2/lists';
const LOG = '/opt/var/log/nfqws2-flowseal.log';
const LOCK = '/opt/var/run/nfqws2-flowseal.lock';
const INIT = '/opt/etc/init.d/S51nfqws2';

const PERSONAL_LISTS = ['user.list', 'exclude.list', 'ipset.list', 'ipset_exclude.list'];
const FLOWSEAL_LISTS = ['list-general.list', 'list-google.list', 'list-exclude.list', 'ipset-exclude.list', 'ipset-all.list'];

function respond(array $data, int $code = 200): never
{
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
  exit();
}

function param(string $name): string
{
  $value = $_POST[$name] ?? '';
  return is_string($value) ? $value : '';
}

// Пароль хранится как "соль:sha256(соль+пароль)", пустая строка - вход без пароля.
// Тот же формат пишет команда nfqws2-flowseal password
function stored_password(): string
{
  $conf = @file_get_contents(WEB_CONF);
  if ($conf !== false && preg_match('/^PASSWORD="([^"]*)"/m', $conf, $m)) {
    return $m[1];
  }
  return '';
}

function password_matches(string $password): bool
{
  [$salt, $hash] = array_pad(explode(':', stored_password(), 2), 2, '');
  return $hash !== '' && hash_equals($hash, hash('sha256', $salt . $password));
}

function store_password(string $password): string
{
  $value = '';
  if ($password !== '') {
    $salt = bin2hex(random_bytes(8));
    $value = $salt . ':' . hash('sha256', $salt . $password);
  }
  @mkdir(STATE_DIR, 0755, true);
  file_put_contents(WEB_CONF, 'PASSWORD="' . $value . "\"\n");
  chmod(WEB_CONF, 0600);
  return $value;
}

function run(string $command): array
{
  exec($command . ' 2>&1', $output, $status);
  return ['status' => $status, 'output' => $output];
}

function tool(string ...$args): array
{
  return run(TOOL . ' ' . implode(' ', array_map('escapeshellarg', $args)));
}

function list_path(string $name, bool $writable): string
{
  $allowed = $writable ? PERSONAL_LISTS : array_merge(PERSONAL_LISTS, FLOWSEAL_LISTS);
  if (!in_array($name, $allowed, true)) {
    respond(['status' => 1, 'error' => 'file'], 400);
  }
  return LISTS_DIR . '/' . $name;
}

function normalize(string $text): string
{
  $text = str_replace(["\r\n", "\r"], "\n", $text);
  $text = preg_replace("/\n{3,}/", "\n\n", $text);
  return $text === '' || str_ends_with($text, "\n") ? $text : $text . "\n";
}

function main(): void
{
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(302);
    header('Location: /');
    exit();
  }
  $cmd = param('cmd');

  session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict']);
  session_start();

  $password = stored_password();
  $authorized = $password === '' || ($_SESSION['auth'] ?? null) === $password;

  if ($cmd === 'login') {
    if ($password === '' || password_matches(param('password'))) {
      $_SESSION['auth'] = $password;
      respond(['status' => 0]);
    }
    respond(['status' => 1]);
  }
  if (!$authorized) {
    respond(['status' => 1, 'error' => 'auth'], 401);
  }

  switch ($cmd) {
    case 'status':
      $result = tool('status', '--json');
      $status = json_decode(implode("\n", $result['output']), true);
      respond(is_array($status) ? ['status' => 0] + $status : ['status' => 1, 'error' => 'tool']);

    case 'strategies':
      $index = json_decode((string)@file_get_contents(STRATEGIES_DIR . '/index.json'), true);
      respond(is_array($index) ? ['status' => 0] + $index : ['status' => 1, 'error' => 'strategies']);

    case 'strategy_set':
      $id = param('id');
      if (!preg_match('/^[a-z0-9-]+$/', $id) || !is_file(STRATEGIES_DIR . "/$id.conf")) {
        respond(['status' => 1, 'error' => 'strategy'], 400);
      }
      respond(tool('strategy', $id));

    case 'policies':
      $result = tool('policy', '--list');
      respond(['status' => 0, 'policies' => array_values(array_filter($result['output'], 'strlen'))]);

    case 'policy_set':
      // Имя политики проверяет утилита: она есть в роутере и годится для конфига
      $mode = param('mode');
      if (!in_array($mode, ['all', 'only', 'except'], true)) {
        respond(['status' => 1, 'error' => 'mode'], 400);
      }
      respond($mode === 'all' ? tool('policy', 'all') : tool('policy', $mode, param('name')));

    case 'file_get':
      $path = list_path(param('name'), false);
      respond(['status' => 0, 'content' => (string)@file_get_contents($path)]);

    case 'file_save':
      $path = list_path(param('name'), true);
      $ok = file_put_contents($path, normalize(param('content'))) !== false;
      respond(['status' => $ok ? 0 : 1]);

    case 'log':
      respond(['status' => 0, 'content' => (string)@file_get_contents(LOG), 'busy' => is_dir(LOCK)]);

    case 'service':
      $action = param('action');
      if (!in_array($action, ['restart', 'stop', 'start'], true)) {
        respond(['status' => 1, 'error' => 'action'], 400);
      }
      respond(run(INIT . ' ' . $action));

    case 'update':
      // Обновление идёт в фоне: оно может перезапустить и сам веб-сервер
      if (is_dir(LOCK)) {
        respond(['status' => 1, 'error' => 'busy']);
      }
      exec(TOOL . ' update > /dev/null 2>&1 &');
      respond(['status' => 0]);

    case 'autoupdate':
      $value = param('value');
      if (!in_array($value, ['on', 'off'], true)) {
        respond(['status' => 1, 'error' => 'value'], 400);
      }
      respond(tool('autoupdate', $value));

    case 'password_set':
      $new = param('password');
      if ($new === '') {
        respond(['status' => 1, 'error' => 'empty'], 400);
      }
      $_SESSION['auth'] = store_password($new);
      respond(['status' => 0]);

    case 'password_off':
      $_SESSION['auth'] = store_password('');
      respond(['status' => 0]);

    case 'logout':
      $_SESSION['auth'] = null;
      respond(['status' => 0]);

    default:
      respond(['status' => 1, 'error' => 'cmd'], 400);
  }
}

main();
