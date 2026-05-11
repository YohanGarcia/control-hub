import 'dart:convert';

import 'package:http/http.dart' as http;

import 'session_store.dart';

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required SessionStore sessionStore,
    http.Client? httpClient,
  })  : _sessionStore = sessionStore,
        _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final SessionStore _sessionStore;
  final http.Client _httpClient;

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = true,
  }) async {
    return _request(
      method: 'POST',
      path: path,
      body: body,
      withAuth: withAuth,
    );
  }

  Future<List<dynamic>> getList(String path, {bool withAuth = true}) async {
    final decoded = await _request(method: 'GET', path: path, withAuth: withAuth);
    return decoded['items'] as List<dynamic>? ?? decoded as List<dynamic>;
  }

  Future<Map<String, dynamic>> get(String path, {bool withAuth = true}) async {
    return _request(method: 'GET', path: path, withAuth: withAuth);
  }

  Future<Map<String, dynamic>> _request({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    bool withAuth = true,
    bool retrying = false,
  }) async {
    final token = withAuth ? _sessionStore.accessToken : null;
    http.Response? response;
    Object? lastError;
    for (final candidateBase in _candidateBaseUrls(baseUrl)) {
      final uri = Uri.parse('$candidateBase$path');
      try {
        if (method == 'GET') {
          response = await _httpClient.get(uri, headers: _headers(token));
        } else {
          response = await _httpClient.post(
            uri,
            headers: _headers(token),
            body: jsonEncode(body ?? {}),
          );
        }
        break;
      } catch (e) {
        lastError = e;
      }
    }

    if (response == null) {
      throw ApiException(_networkMessage(lastError), 0);
    }

    if (
        response.statusCode == 401 &&
        withAuth &&
        !retrying &&
        _sessionStore.refreshToken != null &&
        !path.startsWith('/auth/refresh') &&
        !path.startsWith('/auth/login')) {
      final refreshed = await _tryRefreshToken();
      if (refreshed) {
        return _request(
          method: method,
          path: path,
          body: body,
          withAuth: withAuth,
          retrying: true,
        );
      }
      await _sessionStore.clear();
    }

    return _decodeJson(response);
  }

  Future<bool> _tryRefreshToken() async {
    final refresh = _sessionStore.refreshToken;
    if (refresh == null || refresh.isEmpty) {
      return false;
    }

    http.Response? response;
    for (final candidateBase in _candidateBaseUrls(baseUrl)) {
      try {
        response = await _httpClient.post(
          Uri.parse('$candidateBase/auth/refresh'),
          headers: _headers(null),
          body: jsonEncode({'refresh_token': refresh}),
        );
        break;
      } catch (_) {}
    }

    if (response == null) {
      return false;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return false;
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final access = body['access_token'] as String?;
    final newRefresh = body['refresh_token'] as String?;
    if (access == null || newRefresh == null) {
      return false;
    }
    await _sessionStore.saveTokens(access: access, refresh: newRefresh);
    return true;
  }

  Map<String, String> _headers(String? token) {
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  List<String> _candidateBaseUrls(String current) {
    final list = <String>[current];
    if (current.contains('127.0.0.1')) {
      list.add(current.replaceAll('127.0.0.1', '10.0.2.2'));
    }
    if (current.contains('localhost')) {
      list.add(current.replaceAll('localhost', '10.0.2.2'));
    }
    return list.toSet().toList();
  }

  String _networkMessage(Object? error) {
    var msg = 'No se pudo conectar al servidor API';
    final raw = error?.toString() ?? '';
    if (raw.isNotEmpty) {
      msg = '$msg: $raw';
    }
    if (baseUrl.contains('127.0.0.1') || baseUrl.contains('localhost')) {
      msg = '$msg. Si usas emulador Android, prueba 10.0.2.2 en la API Base URL.';
    }
    return msg;
  }

  Map<String, dynamic> _decodeJson(http.Response response) {
    final dynamic body = response.body.isEmpty ? {} : jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body is Map<String, dynamic> ? body : {'items': body};
    }
    final message = body is Map<String, dynamic> ? body['detail']?.toString() : null;
    throw ApiException(message ?? 'Request failed', response.statusCode);
  }
}

class ApiException implements Exception {
  ApiException(this.message, this.statusCode);

  final String message;
  final int statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
