<?php
// Cookieless, zero-PII Core Web Vitals collector for static hosting (Bluehost).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$logFile = __DIR__ . '/vitals.jsonl';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($logFile)) { echo "[]"; exit; }
    readfile($logFile);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
$allowed = ['LCP', 'INP', 'CLS', 'TTFB'];
if (!is_array($data) || !in_array($data['metric'] ?? '', $allowed, true) || !is_numeric($data['value'] ?? null)) {
    http_response_code(400);
    echo '{"ok":false}';
    exit;
}
$entry = json_encode([
    'build' => substr((string)($data['build'] ?? 'dev'), 0, 32),
    'route' => substr((string)($data['route'] ?? '/'), 0, 160),
    'metric' => $data['metric'],
    'value' => round((float)$data['value'], 4),
    'ts' => time(),
], JSON_UNESCAPED_SLASHES);
file_put_contents($logFile, $entry . "\n", FILE_APPEND | LOCK_EX);
http_response_code(204);
