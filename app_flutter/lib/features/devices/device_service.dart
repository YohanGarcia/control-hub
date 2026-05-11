import '../../core/api_client.dart';
import 'device_metric_model.dart';
import 'device_models.dart';

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
}
