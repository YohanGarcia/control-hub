import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'app_config.dart';

class AppSettingsState {
  const AppSettingsState({required this.apiBaseUrl, required this.initialized});

  final String apiBaseUrl;
  final bool initialized;

  AppSettingsState copyWith({String? apiBaseUrl, bool? initialized}) {
    return AppSettingsState(
      apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl,
      initialized: initialized ?? this.initialized,
    );
  }
}

class AppSettingsController extends StateNotifier<AppSettingsState> {
  AppSettingsController()
      : _storage = const FlutterSecureStorage(),
        super(const AppSettingsState(apiBaseUrl: AppConfig.defaultApiBaseUrl, initialized: false)) {
    load();
  }

  final FlutterSecureStorage _storage;
  static const _apiBaseKey = 'api_base_url';

  Future<void> load() async {
    final stored = await _storage.read(key: _apiBaseKey);
    state = state.copyWith(apiBaseUrl: stored ?? AppConfig.defaultApiBaseUrl, initialized: true);
  }

  Future<void> setApiBaseUrl(String value) async {
    final normalized = value.trim();
    await _storage.write(key: _apiBaseKey, value: normalized);
    state = state.copyWith(apiBaseUrl: normalized);
  }
}
