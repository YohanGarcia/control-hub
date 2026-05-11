class DeviceAction {
  DeviceAction({
    required this.id,
    required this.slug,
    required this.name,
  });

  factory DeviceAction.fromJson(Map<String, dynamic> json) {
    return DeviceAction(
      id: json['id'] as int,
      slug: json['slug'] as String,
      name: json['name'] as String,
    );
  }

  final int id;
  final String slug;
  final String name;
}

class ActionRun {
  ActionRun({
    required this.id,
    required this.requestId,
    required this.status,
    this.actionId,
    this.exitCode,
    this.outputText,
    this.errorText,
    this.createdAt,
  });

  factory ActionRun.fromJson(Map<String, dynamic> json) {
    return ActionRun(
      id: json['id'] as int,
      requestId: json['request_id'] as String,
      status: json['status'] as String,
      actionId: json['action_id'] as int?,
      exitCode: json['exit_code'] as int?,
      outputText: json['output_text'] as String?,
      errorText: json['error_text'] as String?,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : null,
    );
  }

  final int id;
  final String requestId;
  final String status;
  final int? actionId;
  final int? exitCode;
  final String? outputText;
  final String? errorText;
  final DateTime? createdAt;
}
