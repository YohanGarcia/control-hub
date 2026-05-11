import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  SessionStore() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  String? accessToken;
  String? refreshToken;

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  Future<void> load() async {
    accessToken = await _storage.read(key: _accessKey);
    refreshToken = await _storage.read(key: _refreshKey);
  }

  Future<void> saveTokens({required String access, required String refresh}) async {
    accessToken = access;
    refreshToken = refresh;
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  bool get isAuthenticated => accessToken != null && accessToken!.isNotEmpty;

  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
