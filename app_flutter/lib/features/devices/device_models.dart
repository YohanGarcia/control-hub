class Device {
  Device({
    required this.id,
    required this.name,
    required this.hostType,
    required this.isOnline,
    this.osName,
    this.agentVersion,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] as int,
      name: json['name'] as String,
      hostType: json['host_type'] as String,
      isOnline: json['is_online'] as bool? ?? false,
      osName: json['os_name'] as String?,
      agentVersion: json['agent_version'] as String?,
    );
  }

  final int id;
  final String name;
  final String hostType;
  final bool isOnline;
  final String? osName;
  final String? agentVersion;
}
