import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/session_store.dart';
import '../../core/api_client.dart';
import 'auth_service.dart';

class AuthState {
  const AuthState({
    required this.initialized,
    required this.authenticated,
    this.loading = false,
    this.error,
    this.requires2FA = false,
  });

  final bool initialized;
  final bool authenticated;
  final bool loading;
  final String? error;
  final bool requires2FA;

  AuthState copyWith({
    bool? initialized,
    bool? authenticated,
    bool? loading,
    String? error,
    bool? requires2FA,
  }) {
    return AuthState(
      initialized: initialized ?? this.initialized,
      authenticated: authenticated ?? this.authenticated,
      loading: loading ?? this.loading,
      error: error,
      requires2FA: requires2FA ?? false,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._authService, this._sessionStore)
      : super(const AuthState(initialized: false, authenticated: false)) {
    bootstrap();
  }

  final AuthService _authService;
  final SessionStore _sessionStore;

  Future<void> bootstrap() async {
    try {
      await _sessionStore.load();
    } catch (_) {
      state = state.copyWith(initialized: true, authenticated: false, error: null);
      return;
    }
    state = state.copyWith(initialized: true, authenticated: _sessionStore.isAuthenticated, error: null);
  }

  Future<bool> login({required String email, required String password, String? totpCode}) async {
    state = state.copyWith(loading: true, error: null, requires2FA: false);
    try {
      await _authService.login(email: email, password: password, totpCode: totpCode);
      state = state.copyWith(loading: false, authenticated: true, error: null, requires2FA: false);
      return true;
    } on ApiException catch (e) {
      if (e.message == '2FA code required' || (e.statusCode == 401 && e.message.contains('2FA'))) {
        state = state.copyWith(loading: false, authenticated: false, error: null, requires2FA: true);
        return false;
      }
      final message = e.message;
      state = state.copyWith(loading: false, authenticated: false, error: message, requires2FA: false);
      return false;
    } catch (e) {
      state = state.copyWith(loading: false, authenticated: false, error: 'No se pudo iniciar sesion', requires2FA: false);
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _sessionStore.clear();
    } catch (_) {
      // Si falla el storage, igual cerramos sesion en memoria/UI.
    } finally {
      state = state.copyWith(authenticated: false, loading: false, error: null);
    }
  }

  Future<bool> register({required String email, required String password, String? fullName}) async {
    state = state.copyWith(loading: true, error: null);
    try {
      await _authService.register(email: email, password: password, fullName: fullName);
      state = state.copyWith(loading: false, error: null);
      return true;
    } catch (e) {
      final message = e is ApiException ? e.message : 'No se pudo registrar la cuenta';
      state = state.copyWith(loading: false, error: message);
      return false;
    }
  }
}
