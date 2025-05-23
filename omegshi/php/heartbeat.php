<?php
header('Content-Type: application/json');
require 'db.php';

$user_id = intval($_POST['user_id'] ?? 0);

if ($user_id) {
    $stmt = $conn->prepare("UPDATE users SET last_active = NOW() WHERE id = ?");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid user_id']);
} 