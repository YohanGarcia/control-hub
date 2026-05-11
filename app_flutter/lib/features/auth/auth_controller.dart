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
  });

  final bool initialized;
  final bool authenticated;
  final bool loading;
  final String? error;

  AuthState copyWith({
    bool? initialized,
    bool? authenticated,
    bool? loading,
    String? error,
  }) {
    return AuthState(
      initialized: initialized ?? this.initialized,
      authenticated: authenticated ?? this.authenticated,
      loading: loading ?? this.loading,
      error: error,
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

  Future<bool> login({required String email, required String password, required String totpCode}) async {
    state = state.copyWith(loading: true, error: null);
    try {
      await _authService.login(email: email, password: password, totpCode: totpCode);
      state = state.copyWith(loading: false, authenticated: true, error: null);
      return true;
    } catch (e) {
      final message = e is ApiException ? e.message : 'No se pudo iniciar sesion';
      state = state.copyWith(loading: false, authenticated: false, error: message);
      return false;
    }
  }

  Future<void> logout() async {
    await _sessionStore.clear();
    state = state.copyWith(authenticated: false, error: null);
  }
}
