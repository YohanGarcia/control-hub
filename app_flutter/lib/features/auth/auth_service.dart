import '../../core/api_client.dart';
import '../../core/session_store.dart';

class AuthService {
  AuthService(this._apiClient, this._sessionStore);

  final ApiClient _apiClient;
  final SessionStore _sessionStore;

  Future<void> login({
    required String email,
    required String password,
    String? totpCode,
  }) async {
    final body = <String, dynamic>{
      'email': email,
      'password': password,
    };
    if (totpCode != null && totpCode.isNotEmpty) {
      body['totp_code'] = totpCode;
    }

    final response = await _apiClient.post(
      '/auth/login',
      withAuth: false,
      body: body,
    );

    final access = response['access_token'] as String?;
    final refresh = response['refresh_token'] as String?;
    if (access == null || refresh == null) {
      throw ApiException('Token response invalid', 500);
    }
    await _sessionStore.saveTokens(access: access, refresh: refresh);
  }

  Future<void> register({
    required String email,
    required String password,
    String? fullName,
  }) async {
    await _apiClient.post(
      '/auth/register',
      withAuth: false,
      body: {
        'email': email,
        'password': password,
        'full_name': fullName,
      },
    );
  }
}
