import '../../core/api_client.dart';
import 'action_models.dart';

class ActionService {
  ActionService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<DeviceAction>> fetchActions({required int deviceId}) async {
    final list = await _apiClient.getList('/devices/$deviceId/actions');
    return list.map((e) => DeviceAction.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ActionRun> runAction({
    required int deviceId,
    required int actionId,
    required Map<String, dynamic> params,
  }) async {
    final json = await _apiClient.post(
      '/devices/$deviceId/actions/$actionId/run',
      body: {'params': params},
    );
    return ActionRun.fromJson(json);
  }

  Future<List<ActionRun>> fetchHistory({required int deviceId}) async {
    final list = await _apiClient.getList('/devices/$deviceId/actions/history');
    return list.map((e) => ActionRun.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ActionRun>> fetchGlobalRuns({
    required List<int> deviceIds,
    int takePerDevice = 20,
  }) async {
    final all = <ActionRun>[];
    for (final id in deviceIds) {
      final list = await _apiClient.getList('/devices/$id/actions/history');
      final parsed = list.map((e) => ActionRun.fromJson(e as Map<String, dynamic>)).toList();
      all.addAll(parsed.take(takePerDevice));
    }
    all.sort((a, b) {
      final ad = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bd = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bd.compareTo(ad);
    });
    return all;
  }
}
