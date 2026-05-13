class OrganizationItem {
  OrganizationItem({required this.id, required this.name, required this.slug});

  factory OrganizationItem.fromJson(Map<String, dynamic> json) {
    return OrganizationItem(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
    );
  }

  final int id;
  final String name;
  final String slug;
}

class OrganizationMembershipItem {
  OrganizationMembershipItem({
    required this.organizationId,
    required this.organizationName,
    required this.organizationSlug,
    required this.role,
    required this.status,
  });

  factory OrganizationMembershipItem.fromJson(Map<String, dynamic> json) {
    return OrganizationMembershipItem(
      organizationId: json['organization_id'] as int,
      organizationName: json['organization_name'] as String,
      organizationSlug: json['organization_slug'] as String,
      role: json['role'] as String,
      status: json['status'] as String,
    );
  }

  final int organizationId;
  final String organizationName;
  final String organizationSlug;
  final String role;
  final String status;
}

class OrganizationMemberItem {
  OrganizationMemberItem({
    required this.userId,
    required this.email,
    required this.role,
    required this.status,
    this.fullName,
  });

  factory OrganizationMemberItem.fromJson(Map<String, dynamic> json) {
    return OrganizationMemberItem(
      userId: json['user_id'] as int,
      email: json['email'] as String,
      fullName: json['full_name'] as String?,
      role: json['role'] as String,
      status: json['status'] as String,
    );
  }

  final int userId;
  final String email;
  final String? fullName;
  final String role;
  final String status;
}

class AuditEventItem {
  AuditEventItem({
    required this.id,
    required this.eventType,
    required this.createdAt,
    this.targetType,
    this.targetId,
    this.details,
  });

  factory AuditEventItem.fromJson(Map<String, dynamic> json) {
    return AuditEventItem(
      id: json['id'] as int,
      eventType: json['event_type'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      targetType: json['target_type'] as String?,
      targetId: json['target_id'] as String?,
      details: json['details'] as String?,
    );
  }

  final int id;
  final String eventType;
  final DateTime createdAt;
  final String? targetType;
  final String? targetId;
  final String? details;
}

class EnrollmentTokenItem {
  EnrollmentTokenItem({
    required this.id,
    required this.organizationId,
    required this.expiresAt,
    required this.maxUses,
    required this.usedCount,
    this.usedAt,
  });

  factory EnrollmentTokenItem.fromJson(Map<String, dynamic> json) {
    return EnrollmentTokenItem(
      id: json['id'] as int,
      organizationId: json['organization_id'] as int,
      expiresAt: DateTime.parse(json['expires_at'] as String),
      maxUses: json['max_uses'] as int,
      usedCount: json['used_count'] as int,
      usedAt: json['used_at'] == null ? null : DateTime.parse(json['used_at'] as String),
    );
  }

  final int id;
  final int organizationId;
  final DateTime expiresAt;
  final int maxUses;
  final int usedCount;
  final DateTime? usedAt;

  bool get isConsumed => usedCount >= maxUses;
}

class EnrollmentTokenCreated {
  EnrollmentTokenCreated({
    required this.id,
    required this.token,
    required this.expiresAt,
    required this.maxUses,
    required this.usedCount,
  });

  factory EnrollmentTokenCreated.fromJson(Map<String, dynamic> json) {
    return EnrollmentTokenCreated(
      id: json['id'] as int,
      token: json['token'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
      maxUses: json['max_uses'] as int,
      usedCount: json['used_count'] as int,
    );
  }

  final int id;
  final String token;
  final DateTime expiresAt;
  final int maxUses;
  final int usedCount;
}

class OrganizationInviteItem {
  OrganizationInviteItem({
    required this.id,
    required this.role,
    required this.expiresAt,
    required this.createdAt,
    this.usedAt,
  });

  factory OrganizationInviteItem.fromJson(Map<String, dynamic> json) {
    return OrganizationInviteItem(
      id: json['id'] as int,
      role: json['role'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      usedAt: json['used_at'] == null ? null : DateTime.parse(json['used_at'] as String),
    );
  }

  final int id;
  final String role;
  final DateTime expiresAt;
  final DateTime createdAt;
  final DateTime? usedAt;

  bool get isUsed => usedAt != null;
}

class OrganizationInviteCreated {
  OrganizationInviteCreated({
    required this.id,
    required this.token,
    required this.role,
    required this.expiresAt,
  });

  factory OrganizationInviteCreated.fromJson(Map<String, dynamic> json) {
    return OrganizationInviteCreated(
      id: json['id'] as int,
      token: json['token'] as String,
      role: json['role'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
    );
  }

  final int id;
  final String token;
  final String role;
  final DateTime expiresAt;
}
