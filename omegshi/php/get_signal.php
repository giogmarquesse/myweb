<?php
header('Content-Type: application/json');
require 'db.php';

$session_id = intval($_GET['session_id'] ?? 0);
$user_id = intval($_GET['user_id'] ?? 0);

if ($session_id && $user_id) {
    $stmt = $conn->prepare("SELECT id, signal_json FROM signals WHERE session_id = ? AND user_id != ? ORDER BY created_at ASC LIMIT 1");
    $stmt->bind_param('ii', $session_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $signal = json_decode($row['signal_json'], true);
        // Delete after fetch
        $del = $conn->prepare("DELETE FROM signals WHERE id = ?");
        $del->bind_param('i', $row['id']);
        $del->execute();
        echo json_encode(['success' => true, 'signal' => $signal]);
    } else {
        echo json_encode(['success' => true, 'signal' => null]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
} 