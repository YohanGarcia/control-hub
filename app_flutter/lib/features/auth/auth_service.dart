import '../../core/api_client.dart';
import '../../core/session_store.dart';

class AuthService {
  AuthService(this._apiClient, this._sessionStore);

  final ApiClient _apiClient;
  final SessionStore _sessionStore;

  Future<void> login({
    required String email,
    required String password,
    required String totpCode,
  }) async {
    final response = await _apiClient.post(
      '/auth/login',
      withAuth: false,
      body: {
        'email': email,
        'password': password,
        'totp_code': totpCode,
      },
    );

    final access = response['access_token'] as String?;
    final refresh = response['refresh_token'] as String?;
    if (access == null || refresh == null) {
      throw ApiException('Token response invalid', 500);
    }
    await _sessionStore.saveTokens(access: access, refresh: refresh);
  }
}
