<?php
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$session_id = intval($data['session_id'] ?? 0);
$user_id = intval($data['user_id'] ?? 0);
$signal = json_encode($data['signal'] ?? []);

if ($session_id && $user_id && $signal) {
    $stmt = $conn->prepare("INSERT INTO signals (session_id, user_id, signal_json, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param('iis', $session_id, $user_id, $signal);
    $stmt->execute();
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
} 