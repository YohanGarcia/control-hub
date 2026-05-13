import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  SessionStore() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  String? accessToken;
  String? refreshToken;
  int? selectedOrganizationId;

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _selectedOrgKey = 'selected_org_id';

  Future<void> load() async {
    accessToken = await _storage.read(key: _accessKey);
    refreshToken = await _storage.read(key: _refreshKey);
    final rawOrg = await _storage.read(key: _selectedOrgKey);
    selectedOrganizationId = rawOrg == null ? null : int.tryParse(rawOrg);
  }

  Future<void> saveTokens({required String access, required String refresh}) async {
    accessToken = access;
    refreshToken = refresh;
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  bool get isAuthenticated => accessToken != null && accessToken!.isNotEmpty;

  Future<void> saveSelectedOrganizationId(int? organizationId) async {
    selectedOrganizationId = organizationId;
    if (organizationId == null) {
      await _storage.delete(key: _selectedOrgKey);
    } else {
      await _storage.write(key: _selectedOrgKey, value: organizationId.toString());
    }
  }

  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _selectedOrgKey);
  }
}
