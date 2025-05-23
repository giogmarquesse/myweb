<?php
header('Content-Type: application/json');
require 'db.php';

$session_id = intval($_GET['session_id'] ?? $_POST['session_id'] ?? 0);

if ($session_id) {
    $stmt = $conn->prepare("SELECT m.id, m.sender_id, m.message, m.sent_at FROM messages m WHERE m.session_id = ? ORDER BY m.sent_at ASC, m.id ASC");
    $stmt->bind_param('i', $session_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    echo json_encode(['success' => true, 'messages' => $messages]);
} else {
    echo json_encode(['success' => false, 'error' => 'No session_id']);
} 