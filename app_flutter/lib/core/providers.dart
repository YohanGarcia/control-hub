import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/actions/action_service.dart';
import '../features/auth/auth_controller.dart';
import '../features/auth/auth_service.dart';
import '../features/devices/device_service.dart';
import 'api_client.dart';
import 'app_settings_controller.dart';
import 'session_store.dart';
import 'theme_mode_controller.dart';

final appSettingsProvider = StateNotifierProvider<AppSettingsController, AppSettingsState>((ref) {
  return AppSettingsController();
});

final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SessionStore();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final sessionStore = ref.watch(sessionStoreProvider);
  final apiBaseUrl = ref.watch(appSettingsProvider).apiBaseUrl;
  return ApiClient(baseUrl: apiBaseUrl, sessionStore: sessionStore);
});

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(apiClientProvider), ref.watch(sessionStoreProvider));
});

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authServiceProvider), ref.watch(sessionStoreProvider));
});

final deviceServiceProvider = Provider<DeviceService>((ref) {
  return DeviceService(ref.watch(apiClientProvider));
});

final actionServiceProvider = Provider<ActionService>((ref) {
  return ActionService(ref.watch(apiClientProvider));
});

final themeModeProvider = StateNotifierProvider<ThemeModeController, ThemeMode>((ref) {
  return ThemeModeController();
});
