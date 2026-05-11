import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TerminalHistoryStore {
  TerminalHistoryStore({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  String _key(int deviceId) => 'terminal_history_$deviceId';
  String _usageKey(int deviceId) => 'terminal_history_usage_$deviceId';

  Future<List<String>> load(int deviceId) async {
    final raw = await _storage.read(key: _key(deviceId));
    if (raw == null || raw.isEmpty) return <String>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.whereType<String>().toList();
      }
    } catch (_) {
      // ignore malformed
    }
    return <String>[];
  }

  Future<void> append(int deviceId, String command, {int maxItems = 100}) async {
    final cmd = command.trim();
    if (cmd.isEmpty) return;
    final list = await load(deviceId);
    if (list.isNotEmpty && list.last == cmd) return;
    list.add(cmd);
    if (list.length > maxItems) {
      list.removeRange(0, list.length - maxItems);
    }
    await _storage.write(key: _key(deviceId), value: jsonEncode(list));
  }

  Future<Map<String, int>> loadUsage(int deviceId) async {
    final raw = await _storage.read(key: _usageKey(deviceId));
    if (raw == null || raw.isEmpty) return <String, int>{};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        final out = <String, int>{};
        decoded.forEach((key, value) {
          if (value is int) {
            out[key] = value;
          } else if (value is num) {
            out[key] = value.toInt();
          }
        });
        return out;
      }
    } catch (_) {
      // ignore malformed
    }
    return <String, int>{};
  }

  Future<void> bumpUsage(int deviceId, String command) async {
    final cmd = command.trim();
    if (cmd.isEmpty) return;
    final usage = await loadUsage(deviceId);
    usage[cmd] = (usage[cmd] ?? 0) + 1;
    await _storage.write(key: _usageKey(deviceId), value: jsonEncode(usage));
  }

  Future<void> clear(int deviceId) async {
    await _storage.delete(key: _key(deviceId));
    await _storage.delete(key: _usageKey(deviceId));
  }
}
