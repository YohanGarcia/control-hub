import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

class WsClient {
  WebSocketChannel? _channel;

  Stream<Map<String, dynamic>> connect({required String wsBaseUrl, required String token}) {
    final normalizedBase = _normalizeBaseUrl(wsBaseUrl);
    final wsUrl = normalizedBase
        .replaceFirst('http://', 'ws://')
        .replaceFirst('https://', 'wss://');
    final uri = Uri.parse('$wsUrl/ws/client?token=$token');
    _channel = WebSocketChannel.connect(uri);
    return _channel!.stream.map((event) => jsonDecode(event as String) as Map<String, dynamic>);
  }

  String _normalizeBaseUrl(String input) {
    if (input.contains('127.0.0.1')) {
      return input.replaceAll('127.0.0.1', '10.0.2.2');
    }
    if (input.contains('localhost')) {
      return input.replaceAll('localhost', '10.0.2.2');
    }
    return input;
  }

  void send(Map<String, dynamic> payload) {
    final channel = _channel;
    if (channel == null) return;
    channel.sink.add(jsonEncode(payload));
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }
}
