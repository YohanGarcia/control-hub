class DeviceMetric {
  DeviceMetric({
    required this.cpuPercent,
    required this.ramPercent,
    required this.diskPercent,
    required this.uptimeSeconds,
    required this.createdAt,
  });

  factory DeviceMetric.fromJson(Map<String, dynamic> json) {
    return DeviceMetric(
      cpuPercent: (json['cpu_percent'] as num).toDouble(),
      ramPercent: (json['ram_percent'] as num).toDouble(),
      diskPercent: (json['disk_percent'] as num).toDouble(),
      uptimeSeconds: (json['uptime_seconds'] as num).toDouble(),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  final double cpuPercent;
  final double ramPercent;
  final double diskPercent;
  final double uptimeSeconds;
  final DateTime createdAt;
}
