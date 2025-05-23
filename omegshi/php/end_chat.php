<?php
header('Content-Type: application/json');
require 'db.php';

$session_id = intval($_POST['session_id'] ?? 0);
$user_id = intval($_POST['user_id'] ?? 0);

if ($session_id && $user_id) {
    // End the chat session
    $stmt = $conn->prepare("UPDATE chat_sessions SET status = 'ended', ended_at = NOW() WHERE id = ?");
    $stmt->bind_param('i', $session_id);
    $stmt->execute();
    // Set both users to disconnected
    $stmt = $conn->prepare("UPDATE users SET status = 'disconnected' WHERE id IN (SELECT user1_id FROM chat_sessions WHERE id = ?) OR id IN (SELECT user2_id FROM chat_sessions WHERE id = ?)");
    $stmt->bind_param('ii', $session_id, $session_id);
    $stmt->execute();
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
} 