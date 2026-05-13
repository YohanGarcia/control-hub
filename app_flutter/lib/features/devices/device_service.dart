import '../../core/api_client.dart';
import 'device_metric_model.dart';
import 'device_models.dart';
import 'enrollment_models.dart';

class DeviceService {
  DeviceService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Device>> fetchDevices() async {
    final data = await _apiClient.getList('/devices');
    return data.map((item) => Device.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<List<DeviceMetric>> fetchMetrics({
    required int deviceId,
  }) async {
    final data = await _apiClient.getList('/devices/$deviceId/metrics?offset=0&limit=30');
    return data.map((item) => DeviceMetric.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<List<OrganizationItem>> fetchOrganizations() async {
    final data = await _apiClient.getList('/organizations');
    return data.map((item) => OrganizationItem.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<OrganizationItem> createOrganization({required String name, required String slug}) async {
    final data = await _apiClient.post(
      '/organizations',
      body: {'name': name, 'slug': slug},
    );
    return OrganizationItem.fromJson(data);
  }

  Future<List<OrganizationMembershipItem>> fetchOrganizationMemberships() async {
    final data = await _apiClient.getList('/organizations/memberships');
    return data.map((item) => OrganizationMembershipItem.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<EnrollmentTokenCreated> createEnrollmentToken({
    required int organizationId,
    required int expiresInSeconds,
    required int maxUses,
  }) async {
    final data = await _apiClient.post(
      '/organizations/$organizationId/enrollment-tokens',
      body: {
        'expires_in_seconds': expiresInSeconds,
        'max_uses': maxUses,
      },
    );
    return EnrollmentTokenCreated.fromJson(data);
  }

  Future<List<EnrollmentTokenItem>> fetchEnrollmentTokens({required int organizationId}) async {
    final data = await _apiClient.getList('/organizations/$organizationId/enrollment-tokens');
    return data.map((item) => EnrollmentTokenItem.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<void> revokeEnrollmentToken({required int organizationId, required int tokenId}) async {
    await _apiClient.delete('/organizations/$organizationId/enrollment-tokens/$tokenId');
  }

  Future<OrganizationInviteCreated> createOrganizationInvite({
    required int organizationId,
    required String role,
    required int expiresInSeconds,
  }) async {
    final data = await _apiClient.post(
      '/organizations/$organizationId/invites',
      body: {
        'role': role,
        'expires_in_seconds': expiresInSeconds,
      },
    );
    return OrganizationInviteCreated.fromJson(data);
  }

  Future<List<OrganizationInviteItem>> fetchOrganizationInvites({required int organizationId}) async {
    final data = await _apiClient.getList('/organizations/$organizationId/invites');
    return data.map((item) => OrganizationInviteItem.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<void> revokeOrganizationInvite({required int organizationId, required int inviteId}) async {
    await _apiClient.delete('/organizations/$organizationId/invites/$inviteId');
  }

  Future<void> acceptOrganizationInvite({required String token}) async {
    await _apiClient.post('/organizations/invites/accept', body: {'token': token});
  }

  Future<List<OrganizationMemberItem>> fetchOrganizationMembers({required int organizationId}) async {
    final data = await _apiClient.getList('/organizations/$organizationId/members');
    return data.map((item) => OrganizationMemberItem.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<OrganizationMemberItem> updateOrganizationMemberRole({
    required int organizationId,
    required int userId,
    required String role,
  }) async {
    final data = await _apiClient.patch(
      '/organizations/$organizationId/members/$userId',
      body: {'role': role},
    );
    return OrganizationMemberItem.fromJson(data);
  }

  Future<void> removeOrganizationMember({required int organizationId, required int userId}) async {
    await _apiClient.delete('/organizations/$organizationId/members/$userId');
  }

  Future<List<AuditEventItem>> fetchAuditEvents({int offset = 0, int limit = 200}) async {
    final data = await _apiClient.getList('/audit/events?offset=$offset&limit=$limit');
    return data.map((item) => AuditEventItem.fromJson(item as Map<String, dynamic>)).toList();
  }
}
