<?php
header('Content-Type: application/json');
require 'db.php';

$session_id = intval($_POST['session_id'] ?? 0);
$sender_id = intval($_POST['sender_id'] ?? 0);
$message = trim($_POST['message'] ?? '');

if ($session_id && $sender_id && $message !== '') {
    $stmt = $conn->prepare("INSERT INTO messages (session_id, sender_id, message, type) VALUES (?, ?, ?, 'text')");
    $stmt->bind_param('iis', $session_id, $sender_id, $message);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'DB error']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
} 