<?php
header('Content-Type: application/json');
require 'db.php';
session_start();

// Generate a unique session ID for the user
if (!isset($_SESSION['session_id'])) {
    $_SESSION['session_id'] = bin2hex(random_bytes(16));
}
$session_id = $_SESSION['session_id'];

// Insert user if not exists
$stmt = $conn->prepare("SELECT id, status FROM users WHERE session_id = ?");
$stmt->bind_param('s', $session_id);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    $user_id = $row['id'];
    $status = $row['status'];
} else {
    $stmt = $conn->prepare("INSERT INTO users (session_id, status) VALUES (?, 'waiting')");
    $stmt->bind_param('s', $session_id);
    $stmt->execute();
    $user_id = $stmt->insert_id;
    $status = 'waiting';
}

// Try to find another waiting user
$stmt = $conn->prepare("SELECT id, session_id FROM users WHERE status = 'waiting' AND id != ? LIMIT 1");
$stmt->bind_param('i', $user_id);
$stmt->execute();
$result = $stmt->get_result();
if ($partner = $result->fetch_assoc()) {
    // Create chat session
    $stmt = $conn->prepare("INSERT INTO chat_sessions (user1_id, user2_id, status) VALUES (?, ?, 'active')");
    $stmt->bind_param('ii', $partner['id'], $user_id);
    $stmt->execute();
    $session_id_db = $stmt->insert_id;
    // Update both users to connected
    $conn->query("UPDATE users SET status = 'connected' WHERE id IN ($user_id, {$partner['id']})");
    echo json_encode([
        'status' => 'connected',
        'chat_session_id' => $session_id_db,
        'user_id' => $user_id,
        'partner_id' => $partner['id']
    ]);
    exit;
} else {
    // No partner found, stay waiting
    $conn->query("UPDATE users SET status = 'waiting' WHERE id = $user_id");
    echo json_encode([
        'status' => 'waiting',
        'user_id' => $user_id
    ]);
    exit;
} 